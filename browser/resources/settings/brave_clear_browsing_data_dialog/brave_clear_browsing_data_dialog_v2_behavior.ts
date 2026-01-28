/* Copyright (c) 2026 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

import {assert} from 'chrome://resources/js/assert.js';

import {
  SettingsClearBrowsingDataDialogV2Element,
  getDataTypePrefName
} from '../clear_browsing_data_dialog/clear_browsing_data_dialog_v2.js'

import {BrowsingDataType} from '../clear_browsing_data_dialog/clear_browsing_data_browser_proxy.js';
import {loadTimeData} from '../i18n_setup.js'

import {
  BraveClearBrowsingDataDialogBrowserProxy,
  BraveClearBrowsingDataDialogBrowserProxyImpl
} from './brave_clear_browsing_data_dialog_proxy.js'

export class BraveSettingsClearBrowsingDataDialogV2Element
extends SettingsClearBrowsingDataDialogV2Element {
  declare private braveRewardsEnabled_: boolean
  declare private tabsNames_: string[]
  declare private selectedTabIndex_: number
  private onClearBraveAdsDataClickHandler_: ((e: Event) => void)

  // @ts-expect-error - TS doesn't see the base class properties at compile time
  // because the import is resolved at build time, but override is correct
  static get properties() {
    return {
      ...super.properties,

      braveRewardsEnabled_: {
        type: Boolean,
        value: false,
      },

      tabsNames_: {
        readOnly: true,
        type: Array,
        value: () => {
          return [
            loadTimeData.getString('clearBrowsingData'),
            loadTimeData.getString('onExitPageTitle')
          ]
        }
      },

      selectedTabIndex_: {
        type: Number,
        value: 0,
        observer: 'selectedTabIndexChanged_',
      }
    }
  }

  private clearDataBrowserProxy_: BraveClearBrowsingDataDialogBrowserProxy =
    BraveClearBrowsingDataDialogBrowserProxyImpl.getInstance()

  constructor() {
    super()

    // Initialize new properties
    this.onClearBraveAdsDataClickHandler_ = () => {}
  }

  override ready() {
    super.ready()

    this.addWebUiListener(
      'brave-rewards-enabled-changed', (enabled: boolean) => {
      this.braveRewardsEnabled_ = enabled
    })

    this.clearDataBrowserProxy_.getBraveRewardsEnabled().then((enabled) => {
      this.braveRewardsEnabled_ = enabled
    })

    // Set up counter text updates for on-exit page when counters are updated
    this.addWebUiListener(
      'browsing-data-counter-text-update',
      this.updateOnExitCountersText_.bind(this))
  }

  /**
   * Updates counter text for the on-exit page
   */
  private updateOnExitCountersText_(prefName: string, text: string) {
    const onExitPage = this.querySelectorById_('#on-exit-tab') as any
    if (onExitPage && onExitPage.setCounter) {
      // Extract the counter key from the pref name
      // e.g., 'browser.clear_data.browsing_history' -> 'browsing_history'
      const counterKey = prefName.split('.').pop()
      if (counterKey) {
        onExitPage.setCounter(counterKey, text)
      }
    }
  }

  override connectedCallback() {
    super.connectedCallback()

    // Set up event listeners
    this.onClearBraveAdsDataClickHandler_ = this.clearBraveAdsData_.bind(this)

    // @ts-ignore - Polymer element has addEventListener
    this.addEventListener('clear-data-on-exit-page-change',
      this.onClearDataOnExitPageChange_.bind(this))
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.onClearBraveAdsDataClickHandler_ = () => {}
  }

  /**
   * Helper function for template bindings to check if a specific tab is selected
   */
  private isTabSelected_(currentIndex: number, expectedIndex: number): boolean {
    return currentIndex === expectedIndex
  }

  /**
   * Observer for selectedTabIndex_ changes
   */
  private selectedTabIndexChanged_(newIndex: number) {
    console.log('[Brave] selectedTabIndexChanged_:', newIndex)

    const deleteButton = this.querySelectorById_('#deleteButton')
    const saveButton = this.querySelectorById_('#saveOnExitSettingsConfirm')

    if (newIndex === 0) {
      // Clear data tab - show delete button, hide save button
      deleteButton?.removeAttribute('hidden')
      saveButton?.setAttribute('hidden', '')
    } else {
      // On exit tab - hide delete button, show save button
      deleteButton?.setAttribute('hidden', '')
      saveButton?.removeAttribute('hidden')
    }
  }

  /**
   * Handles changes to the "On Exit" page settings
   */
  private onClearDataOnExitPageChange_() {
    const onExitPage = this.querySelectorById_('#on-exit-tab') as any
    const saveButton = this.querySelectorById_('#saveOnExitSettingsConfirm') as HTMLButtonElement

    if (onExitPage && saveButton) {
      // Enable/disable save button based on whether settings changed
      if (onExitPage.isModified_) {
        saveButton.removeAttribute('disabled')
      } else {
        saveButton.setAttribute('disabled', '')
      }
    }
  }

  private querySelectorById_(selector: string): HTMLElement | null {
    // @ts-ignore - Access shadow root for querying
    return this.shadowRoot?.querySelector(selector) || null
  }

  override setUpDataTypeOptionLists_() {
    super.setUpDataTypeOptionLists_()

// <if expr="enable_ai_chat">
    if (loadTimeData.getBoolean('isLeoAssistantAllowed')
        && loadTimeData.getBoolean('isLeoAssistantHistoryAllowed')) {
      this.updateCounterText_(getDataTypePrefName(BrowsingDataType.BRAVE_AI_CHAT),
                              loadTimeData.getString('aiChatClearHistoryDataSubLabel'))
    } else {
      this.removeLeoAIFromList()
    }
// </if>

// <if expr="not enable_ai_chat">
    this.removeLeoAIFromList()
// </if>
  }

  private removeLeoAIFromList() {
    const leoExpandedIndex =
        this.expandedBrowsingDataTypeOptionsList_.map(option => option.pref.key)
            .indexOf(getDataTypePrefName(BrowsingDataType.BRAVE_AI_CHAT));
    if (leoExpandedIndex !== -1) {
      this.expandedBrowsingDataTypeOptionsList_.splice(leoExpandedIndex, 1);
      return
    }

    const leoMoreIndex =
        this.moreBrowsingDataTypeOptionsList_.map(option => option.pref.key)
            .indexOf(getDataTypePrefName(BrowsingDataType.BRAVE_AI_CHAT));
    assert(leoMoreIndex !== -1)
    this.moreBrowsingDataTypeOptionsList_.splice(leoMoreIndex, 1);
  }

  /**
   * Clears Brave Ads data.
   */
  private clearBraveAdsData_(e: Event) {
    e.preventDefault()
    this.clearDataBrowserProxy_.clearBraveAdsData()
    // TODO: Close dialog.
  }
}
