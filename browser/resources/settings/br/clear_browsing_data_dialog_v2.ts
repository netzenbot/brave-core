/* Copyright (c) 2026 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

// Import required components
import 'chrome://resources/cr_elements/cr_tabs/cr_tabs.js'
import '../brave_clear_browsing_data_dialog/brave_clear_browsing_data_on_exit_page_v2.js'

import {
  RegisterPolymerComponentReplacement,
  RegisterPolymerTemplateModifications,
  RegisterStyleOverride
} from 'chrome://resources/brave/polymer_overriding.js'

import {getTrustedHTML} from 'chrome://resources/js/static_types.js'
import {html} from 'chrome://resources/polymer/v3_0/polymer/polymer_bundled.min.js'

import {
  BraveSettingsClearBrowsingDataDialogV2Element
} from '../brave_clear_browsing_data_dialog/brave_clear_browsing_data_dialog_v2_behavior.js'

import {loadTimeData} from '../i18n_setup.js'

RegisterStyleOverride(
  'settings-clear-browsing-data-dialog-v2',
  html`
    <style>
      #reset-brave-rewards-data, #clear-brave-ads-data {
        display: block;
        margin-top: 10px;
      }
   </style>
  `
)

RegisterPolymerComponentReplacement(
  'settings-clear-browsing-data-dialog-v2',
  BraveSettingsClearBrowsingDataDialogV2Element
)

RegisterPolymerTemplateModifications({
  'settings-clear-browsing-data-dialog-v2': (templateContent) => {
    console.log('[Brave] Modifying clear-browsing-data-dialog-v2 template')

    // Find the title element and add tabs after it
    const titleElement = templateContent.querySelector('div[slot="title"]')
    if (titleElement) {
      // Add tabs right after the title
      titleElement.insertAdjacentHTML(
        'afterend',
        getTrustedHTML`
          <div slot="header">
            <cr-tabs id="tabs" tab-names="[[tabsNames_]]"
                selected="{{selectedTabIndex_}}">
            </cr-tabs>
          </div>
        `
      )
      // Hide the title since we have tabs now
      titleElement.setAttribute('hidden', '')
    }

    // Find the time picker header and body - we'll hide these when on On Exit tab
    const timePickerHeader = templateContent.querySelector('div[slot="header"]:has(settings-clear-browsing-data-time-picker)')
    if (timePickerHeader) {
      console.log('[Brave] Found time picker header, adding hidden binding')
      // Add hidden binding - show only when tab 0 is selected
      timePickerHeader.setAttribute('hidden', '[[!isTabSelected_(selectedTabIndex_, 0)]]')
    }

    const dialogBody = templateContent.querySelector('div[slot="body"]')
    if (!dialogBody) {
      console.error(
        '[Settings] missing \'slot="body"\' in clear-browsing-data-dialog-v2')
      return
    }

    // Hide the original body content when on On Exit tab
    dialogBody.setAttribute('hidden', '[[!isTabSelected_(selectedTabIndex_, 0)]]')

    // Add our on-exit page content after the main body
    dialogBody.insertAdjacentHTML(
      'afterend',
      getTrustedHTML`
        <div slot="body" id="onExitBody"
             hidden="[[!isTabSelected_(selectedTabIndex_, 1)]]">
          <settings-brave-clear-browsing-data-on-exit-page-v2
            id="on-exit-tab"
            prefs="{{prefs}}">
          </settings-brave-clear-browsing-data-on-exit-page-v2>
        </div>
      `
    )

    // Append Save button.
    const confirmButtonElement = templateContent.querySelector('#deleteButton')
    if (!confirmButtonElement) {
      console.error(
        '[Settings] missing #deleteButton in clear-browsing-data-dialog-v2')
      return
    }
    confirmButtonElement.insertAdjacentHTML(
      'afterend',
      getTrustedHTML`
        <cr-button
          id="saveOnExitSettingsConfirm"
          class="action-button"
          disabled hidden>
        </cr-button>
      `)
    const saveButton =
      templateContent.getElementById('saveOnExitSettingsConfirm')
    if (!saveButton) {
      console.error('[Settings] missing save button')
    } else {
      saveButton.textContent = loadTimeData.getString('save')
    }

    // Append clear Brave Ads data link (reuse dialogBody from above)
    dialogBody.insertAdjacentHTML(
      'beforeend',
      getTrustedHTML`
        <a id="clear-brave-ads-data"
          href="chrome://settings/privacy"
          onClick="[[onClearBraveAdsDataClickHandler_]]"
          hidden="[[braveRewardsEnabled_]]">
        </a>
      `)
    const clearBraveAdsLink =
      templateContent.getElementById('clear-brave-ads-data')
    if (!clearBraveAdsLink) {
      console.error('[Settings] missing clear Brave Ads link')
    } else {
      clearBraveAdsLink.textContent =
        loadTimeData.getString('clearBraveAdsData')
    }

    // Append reset Brave Rewards data link
    dialogBody.insertAdjacentHTML(
      'beforeend',
      getTrustedHTML`
        <a id="reset-brave-rewards-data"
          href="chrome://rewards/#reset"
          hidden="[[!braveRewardsEnabled_]]">
        </a>
      `)
    const rewardsResetLink =
      templateContent.getElementById('reset-brave-rewards-data')
    if (!rewardsResetLink) {
      console.error('[Settings] missing reset Brave Rewards link')
    } else {
      rewardsResetLink.textContent = loadTimeData.getString('resetRewardsData')
    }

    // "Leo AI" checkbox is added by SettingsClearBrowsingDataDialogV2Element
  }
})
