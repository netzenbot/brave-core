/* Copyright (c) 2025 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

#include <string>
#include <string_view>

#include "base/test/scoped_feature_list.h"
#include "brave/browser/brave_browser_features.h"
#include "brave/components/ai_chat/core/common/buildflags/buildflags.h"
#include "brave/components/brave_news/common/buildflags/buildflags.h"
#include "brave/components/brave_rewards/core/buildflags/buildflags.h"
#include "brave/components/brave_vpn/common/buildflags/buildflags.h"
#include "brave/components/constants/pref_names.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/common/webui_url_constants.h"
#include "chrome/test/base/chrome_test_utils.h"
#include "chrome/test/base/in_process_browser_test.h"
#include "chrome/test/base/ui_test_utils.h"
#include "components/policy/core/browser/browser_policy_connector.h"
#include "components/policy/core/common/mock_configuration_policy_provider.h"
#include "components/policy/core/common/policy_map.h"
#include "components/policy/core/common/policy_types.h"
#include "components/policy/policy_constants.h"
#include "components/prefs/pref_service.h"
#include "content/public/browser/web_contents.h"
#include "content/public/test/browser_test.h"
#include "content/public/test/browser_test_utils.h"
#include "testing/gtest/include/gtest/gtest.h"

#if BUILDFLAG(ENABLE_AI_CHAT)
#include "brave/browser/ui/brave_ui_features.h"
#include "brave/components/ai_chat/core/common/features.h"
#include "brave/components/brave_search_conversion/pref_names.h"
#endif

#if BUILDFLAG(ENABLE_BRAVE_NEWS)
#include "brave/components/brave_news/common/features.h"
#include "brave/components/brave_news/common/pref_names.h"
#endif

#if BUILDFLAG(ENABLE_BRAVE_REWARDS)
#include "brave/components/l10n/common/test/scoped_default_locale.h"
#endif

#if BUILDFLAG(ENABLE_BRAVE_VPN)
#include "brave/components/brave_vpn/common/features.h"
#include "brave/components/skus/common/features.h"
#endif

// Base class for tests that verify the NTP loads correctly when a feature is
// disabled via admin policy. Provides policy provider setup and DOM assertion
// helpers.
class NTPFeatureDisabledTestBase : public InProcessBrowserTest {
 protected:
  NTPFeatureDisabledTestBase() {
    // The hidden elements exist only on the refreshed NTP.
    scoped_feature_list_.InitAndEnableFeature(
        features::kBraveNewTabPageRefreshEnabled);
  }

  void SetUpInProcessBrowserTestFixture() override {
    InProcessBrowserTest::SetUpInProcessBrowserTestFixture();
    EXPECT_CALL(policy_provider_, IsInitializationComplete(testing::_))
        .WillRepeatedly(testing::Return(true));
    policy::BrowserPolicyConnector::SetPolicyProviderForTesting(
        &policy_provider_);
  }

  void SetPolicy(const std::string& key, base::Value value) {
    policy::PolicyMap policies;
    policies.Set(key, policy::POLICY_LEVEL_MANDATORY, policy::POLICY_SCOPE_USER,
                 policy::POLICY_SOURCE_PLATFORM, std::move(value), nullptr);
    policy_provider_.UpdateChromePolicy(policies);
  }

  void NavigateToNewTabAndWaitFor(std::string_view selector) {
    ASSERT_TRUE(ui_test_utils::NavigateToURL(browser(),
                                             GURL(chrome::kChromeUINewTabURL)));
    ASSERT_TRUE(content::WaitForLoadStop(GetActiveWebContents()));

    constexpr std::string_view kWaitForElement = R"(
      new Promise(resolve => {
        const observer = new MutationObserver(check);
        function check() {
          if (document.querySelector($1)) {
            observer.disconnect();
            resolve(true);
          }
        }
        observer.observe(document.body, {childList: true, subtree: true});
        check();
      })
    )";
    ASSERT_EQ(true,
              content::EvalJs(GetActiveWebContents(),
                              content::JsReplace(kWaitForElement, selector)))
        << selector;
  }

  void ExpectElementNotPresent(std::string_view test_id) {
    constexpr std::string_view kScript = R"(
      Boolean(document.querySelector('[data-testid="' + $1 + '"]'))
    )";
    EXPECT_EQ(false, content::EvalJs(GetActiveWebContents(),
                                     content::JsReplace(kScript, test_id)))
        << "Element '" << test_id << "' should not be present";
  }

  content::WebContents* GetActiveWebContents() {
    return chrome_test_utils::GetActiveWebContents(this);
  }

 private:
  base::test::ScopedFeatureList scoped_feature_list_;
  testing::NiceMock<policy::MockConfigurationPolicyProvider> policy_provider_;
};

// --- Rewards disabled by policy ---

#if BUILDFLAG(ENABLE_BRAVE_REWARDS)
class NTPRewardsDisabledByPolicyTest : public NTPFeatureDisabledTestBase {
 protected:
  void SetUpInProcessBrowserTestFixture() override {
    NTPFeatureDisabledTestBase::SetUpInProcessBrowserTestFixture();
    SetPolicy(policy::key::kBraveRewardsDisabled, base::Value(true));
  }

  void SetUpOnMainThread() override {
    NTPFeatureDisabledTestBase::SetUpOnMainThread();
    browser()->GetProfile()->GetPrefs()->SetBoolean(kNewTabPageShowRewards,
                                                    true);
  }

 private:
  brave_l10n::test::ScopedDefaultLocale locale_{"en_US"};
};

IN_PROC_BROWSER_TEST_F(NTPRewardsDisabledByPolicyTest,
                       PageLoadsAndWidgetHidden) {
  ASSERT_NO_FATAL_FAILURE(NavigateToNewTabAndWaitFor(".ntp-widget"));
  ExpectElementNotPresent("rewards-widget-tab");
  ExpectElementNotPresent("rewards-widget");
}
#endif  // BUILDFLAG(ENABLE_BRAVE_REWARDS)

// --- VPN disabled by policy ---

#if BUILDFLAG(ENABLE_BRAVE_VPN)
class NTPVPNDisabledByPolicyTest : public NTPFeatureDisabledTestBase {
 protected:
  NTPVPNDisabledByPolicyTest() {
    vpn_features_.InitWithFeatures(
        {brave_vpn::features::kBraveVPN, skus::features::kSkusFeature}, {});
  }

  void SetUpInProcessBrowserTestFixture() override {
    NTPFeatureDisabledTestBase::SetUpInProcessBrowserTestFixture();
    SetPolicy(policy::key::kBraveVPNDisabled, base::Value(true));
  }

  void SetUpOnMainThread() override {
    NTPFeatureDisabledTestBase::SetUpOnMainThread();
    browser()->GetProfile()->GetPrefs()->SetBoolean(kNewTabPageShowBraveVPN,
                                                    true);
  }

 private:
  base::test::ScopedFeatureList vpn_features_;
};

IN_PROC_BROWSER_TEST_F(NTPVPNDisabledByPolicyTest, PageLoadsAndWidgetHidden) {
  ASSERT_NO_FATAL_FAILURE(NavigateToNewTabAndWaitFor(".ntp-widget"));
  ExpectElementNotPresent("vpn-widget-tab");
  ExpectElementNotPresent("vpn-widget");
}
#endif  // BUILDFLAG(ENABLE_BRAVE_VPN)

// --- AI Chat disabled by policy ---

#if BUILDFLAG(ENABLE_AI_CHAT)
class NTPAIChatDisabledByPolicyTest : public NTPFeatureDisabledTestBase {
 protected:
  // Enable everything that shows the chat input so only the policy hides it.
  NTPAIChatDisabledByPolicyTest() {
    ai_chat_feature_list_.InitWithFeaturesAndParameters(
        {{features::kBraveNtpSearchWidget, {}},
         {ai_chat::features::kAIChat, {}},
         {ai_chat::features::kShowAIChatInputOnNewTabPage,
          {{"day_zero", "false"}}}},
        {});
  }

  void SetUpInProcessBrowserTestFixture() override {
    NTPFeatureDisabledTestBase::SetUpInProcessBrowserTestFixture();
    SetPolicy(policy::key::kBraveAIChatEnabled, base::Value(false));
  }

  void SetUpOnMainThread() override {
    NTPFeatureDisabledTestBase::SetUpOnMainThread();
    auto* prefs = browser()->GetProfile()->GetPrefs();
    prefs->SetBoolean(brave_search_conversion::prefs::kShowNTPSearchBox, true);
    prefs->SetBoolean(brave_search_conversion::prefs::kShowNTPChatInput, true);
  }

 private:
  base::test::ScopedFeatureList ai_chat_feature_list_;
};

IN_PROC_BROWSER_TEST_F(NTPAIChatDisabledByPolicyTest, PageLoadsAndChatHidden) {
  ASSERT_NO_FATAL_FAILURE(
      NavigateToNewTabAndWaitFor(".searchbox-container input"));
  ExpectElementNotPresent("query-mode-toggle");
  ExpectElementNotPresent("ntp-chat-input");
}
#endif  // BUILDFLAG(ENABLE_AI_CHAT)

// --- News disabled by policy ---

#if BUILDFLAG(ENABLE_BRAVE_NEWS)
class NTPNewsDisabledByPolicyTest : public NTPFeatureDisabledTestBase {
 protected:
  void SetUpInProcessBrowserTestFixture() override {
    NTPFeatureDisabledTestBase::SetUpInProcessBrowserTestFixture();
    SetPolicy(policy::key::kBraveNewsDisabled, base::Value(true));
  }

  void SetUpOnMainThread() override {
    NTPFeatureDisabledTestBase::SetUpOnMainThread();
    browser()->GetProfile()->GetPrefs()->SetBoolean(
        brave_news::prefs::kNewTabPageShowToday, true);
  }

 private:
  base::test::ScopedFeatureList news_features_{
      brave_news::features::kBraveNewsFeedUpdate};
};

IN_PROC_BROWSER_TEST_F(NTPNewsDisabledByPolicyTest, PageLoadsAndWidgetHidden) {
  ASSERT_NO_FATAL_FAILURE(NavigateToNewTabAndWaitFor(".ntp-widget"));
  ExpectElementNotPresent("news-widget-tab");
  ExpectElementNotPresent("news-widget");
}
#endif  // BUILDFLAG(ENABLE_BRAVE_NEWS)
