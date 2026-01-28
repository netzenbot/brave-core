// Copyright (c) 2026 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// you can obtain one at https://mozilla.org/MPL/2.0/.

import {PrefsMixin} from '/shared/settings/prefs/prefs_mixin.js'
import {BaseMixin} from '../base_mixin.js'
import {PolymerElement} from 'chrome://resources/polymer/v3_0/polymer/polymer_bundled.min.js'
import {loadTimeData} from '../i18n_setup.js'
import {CrSettingsPrefs} from '/shared/settings/prefs/prefs_types.js';
import {assertNotReached, assertNotReachedCase} from 'chrome://resources/js/assert.js'

import '../settings_shared.css.js'
import '../settings_vars.css.js'
import '../controls/settings_checkbox.js'
import 'chrome://resources/cr_elements/cr_button/cr_button.js'
import 'chrome://resources/cr_elements/cr_icon/cr_icon.js'
import '../icons.html.js'
import {getTemplate} from './brave_clear_browsing_data_on_exit_page_v2.html.js'
// @ts-ignore - Chromium path resolved at build time
import {BrowsingDataType} from '../clear_browsing_data_dialog/clear_browsing_data_browser_proxy.js'

/**
 * The list of all available Browsing Data types for "On Exit" in the default
 * order they should appear in the page.
 */
const ALL_BROWSING_DATATYPES_ON_EXIT_LIST: BrowsingDataType[] = [
  BrowsingDataType.HISTORY,
  BrowsingDataType.SITE_DATA,
  BrowsingDataType.CACHE,
// <if expr="enable_ai_chat">
  BrowsingDataType.BRAVE_AI_CHAT,
// </if>
  BrowsingDataType.DOWNLOADS,
  BrowsingDataType.FORM_DATA,
  BrowsingDataType.SITE_SETTINGS,
  BrowsingDataType.HOSTED_APPS_DATA,
];

/**
 * The list of Browsing Data types that should be expanded by default on the
 * "On Exit" page.
 */
const DEFAULT_BROWSING_DATATYPES_ON_EXIT_LIST: BrowsingDataType[] = [
  BrowsingDataType.HISTORY,
  BrowsingDataType.SITE_DATA,
  BrowsingDataType.CACHE,
];

interface BrowsingDataTypeOption {
  label: string;
  subLabel?: string;
  pref: chrome.settingsPrivate.PrefObject;
}

function getDataTypeLabel(datatypes: BrowsingDataType) {
  switch (datatypes) {
    case BrowsingDataType.HISTORY:
      return loadTimeData.getString('clearBrowsingHistory');
    case BrowsingDataType.CACHE:
      return loadTimeData.getString('clearCache');
    case BrowsingDataType.SITE_DATA:
      return loadTimeData.getString('clearCookies');
    case BrowsingDataType.FORM_DATA:
      return loadTimeData.getString('clearFormData');
    case BrowsingDataType.SITE_SETTINGS:
      return loadTimeData.getString('siteSettings');
    case BrowsingDataType.DOWNLOADS:
      return loadTimeData.getString('clearDownloadHistory');
    case BrowsingDataType.HOSTED_APPS_DATA:
      return loadTimeData.getString('clearHostedAppData');
// <if expr="enable_ai_chat">
    case BrowsingDataType.BRAVE_AI_CHAT:
      return loadTimeData.getString('aiChatClearHistoryData');
// </if>
    default:
      assertNotReachedCase(datatypes);
  }
}

function getDataTypePrefNameOnExit(datatypes: BrowsingDataType) {
  switch (datatypes) {
    case BrowsingDataType.HISTORY:
      return 'browser.clear_data.browsing_history_on_exit';
    case BrowsingDataType.CACHE:
      return 'browser.clear_data.cache_on_exit';
    case BrowsingDataType.SITE_DATA:
      return 'browser.clear_data.cookies_on_exit';
    case BrowsingDataType.FORM_DATA:
      return 'browser.clear_data.form_data_on_exit';
    case BrowsingDataType.SITE_SETTINGS:
      return 'browser.clear_data.site_settings_on_exit';
    case BrowsingDataType.DOWNLOADS:
      return 'browser.clear_data.download_history_on_exit';
    case BrowsingDataType.HOSTED_APPS_DATA:
      return 'browser.clear_data.hosted_apps_data_on_exit';
// <if expr="enable_ai_chat">
    case BrowsingDataType.BRAVE_AI_CHAT:
      return 'browser.clear_data.brave_leo_on_exit';
// </if>
    default:
      assertNotReachedCase(datatypes);
  }
}

function getDataTypeCounterKey(datatype: BrowsingDataType) {
  switch (datatype) {
    case BrowsingDataType.HISTORY:
      return 'browsing_history';
    case BrowsingDataType.CACHE:
      return 'cache';
    case BrowsingDataType.SITE_DATA:
      return 'cookies';
    case BrowsingDataType.FORM_DATA:
      return 'form_data';
    case BrowsingDataType.SITE_SETTINGS:
      return 'site_settings';
    case BrowsingDataType.DOWNLOADS:
      return 'download_history';
    case BrowsingDataType.HOSTED_APPS_DATA:
      return 'hosted_apps_data';
// <if expr="enable_ai_chat">
    case BrowsingDataType.BRAVE_AI_CHAT:
      return 'brave_leo';
// </if>
    default:
      assertNotReached();
  }
}

export interface SettingsBraveClearBrowsingDataOnExitPageV2Element {
  $: {
    checkboxContainer: HTMLElement,
    showMoreButton: HTMLElement,
  }
}

const SettingsBraveClearBrowsingDataOnExitPageV2ElementBase =
  PrefsMixin(BaseMixin(PolymerElement))

export class SettingsBraveClearBrowsingDataOnExitPageV2Element
extends SettingsBraveClearBrowsingDataOnExitPageV2ElementBase {
  static get is() {
    return 'settings-brave-clear-browsing-data-on-exit-page-v2'
  }

  static get template() {
    return getTemplate()
  }

  static getProperties() {
    return {
      prefs: {
        type: Object,
        notify: true,
      },

      counters: {
        type: Object,
        // Will be filled as results are reported.
        value() {
          return {}
        }
      },

      isModified_: {
        type: Boolean,
        value: false,
      },

      isChildAccount_: {
        type: Boolean,
        value() {
          return loadTimeData.getBoolean('isChildAccount')
        },
      },

      dataTypesExpanded_: {
        type: Boolean,
        value: false,
      },

      expandedBrowsingDataTypeOptionsList_: {
        type: Array,
        value: () => [],
      },

      moreBrowsingDataTypeOptionsList_: {
        type: Array,
        value: () => [],
      },

      showMoreButtonLabel_: {
        type: String,
        computed: 'computeShowMoreButtonLabel_(dataTypesExpanded_)',
      },

// <if expr="enable_ai_chat">
      isLeoAssistantAndHistoryAllowed_: {
        type: Boolean,
        value() {
          return loadTimeData.getBoolean('isLeoAssistantAllowed')
              && loadTimeData.getBoolean('isLeoAssistantHistoryAllowed')
        },
      }
// </if>
    }
  }

  public isModified_: boolean
  private dataTypesExpanded_: boolean
  private showMoreButtonLabel_: string
  private expandedBrowsingDataTypeOptionsList_: BrowsingDataTypeOption[]
  private moreBrowsingDataTypeOptionsList_: BrowsingDataTypeOption[]

  private counters: {[k: string]: string} = {}
  private isChildAccount_: boolean
// <if expr="enable_ai_chat">
  private isLeoAssistantAndHistoryAllowed_: boolean
// </if>

  override ready() {
    super.ready()

    CrSettingsPrefs.initialized.then(() => {
      this.setUpDataTypeOptionLists_();
    });

    this.addEventListener(
      'settings-boolean-control-change', this.updateModified_)
  }

  /**
   * Sets up the data type option lists (expanded and "more" options)
   */
  private setUpDataTypeOptionLists_() {
    const expandedOptionsList: BrowsingDataTypeOption[] = [];
    const moreOptionsList: BrowsingDataTypeOption[] = [];

    ALL_BROWSING_DATATYPES_ON_EXIT_LIST.forEach((datatype) => {
      console.log(datatype)
      if (!this.shouldDataTypeBeIncluded_(datatype)) {
        return;
      }

      const datatypeOption: BrowsingDataTypeOption = {
        label: getDataTypeLabel(datatype),
        subLabel: this.counters[getDataTypeCounterKey(datatype)] || '',
        pref: this.getPref(getDataTypePrefNameOnExit(datatype)),
      };

      if (this.shouldDataTypeBeExpanded_(datatype)) {
        expandedOptionsList.push(datatypeOption);
      } else {
        moreOptionsList.push(datatypeOption);
      }
    });

    this.expandedBrowsingDataTypeOptionsList_ = expandedOptionsList;
    this.moreBrowsingDataTypeOptionsList_ = moreOptionsList;
  }

  /**
   * Determines if a data type should be included in the lists
   */
  private shouldDataTypeBeIncluded_(datatype: BrowsingDataType): boolean {
    // Skip browsing/download history for child accounts
    if (this.isChildAccount_ &&
        (datatype === BrowsingDataType.HISTORY ||
         datatype === BrowsingDataType.DOWNLOADS)) {
      return false;
    }

// <if expr="enable_ai_chat">
    // Skip Leo if not allowed
    if (datatype === BrowsingDataType.BRAVE_AI_CHAT &&
        !this.isLeoAssistantAndHistoryAllowed_) {
      return false;
    }
// </if>

    return true;
  }

  /**
   * Determines if a data type should appear in the expanded list
   */
  private shouldDataTypeBeExpanded_(datatype: BrowsingDataType): boolean {
    return DEFAULT_BROWSING_DATATYPES_ON_EXIT_LIST.includes(datatype) ||
        this.getPref(getDataTypePrefNameOnExit(datatype)).value;
  }

  /**
   * Sets counter text for a specific data type
   */
  public setCounter(counter: string, text: string) {
    this.set('counters.' + counter, text);

    // Update the corresponding option's subLabel in the lists
    this.updateCounterInLists_(counter, text);
  }

  /**
   * Updates the counter text in the data type option lists
   */
  private updateCounterInLists_(counterKey: string, text: string) {
    // Update in expanded list
    for (let i = 0; i < this.expandedBrowsingDataTypeOptionsList_.length; i++) {
      const option = this.expandedBrowsingDataTypeOptionsList_[i];
      // Find the datatype for this pref
      for (const datatype of ALL_BROWSING_DATATYPES_ON_EXIT_LIST) {
        if (getDataTypePrefNameOnExit(datatype) === option.pref.key &&
            getDataTypeCounterKey(datatype) === counterKey) {
          this.set(`expandedBrowsingDataTypeOptionsList_.${i}.subLabel`, text);
          return;
        }
      }
    }

    // Update in more list
    for (let i = 0; i < this.moreBrowsingDataTypeOptionsList_.length; i++) {
      const option = this.moreBrowsingDataTypeOptionsList_[i];
      // Find the datatype for this pref
      for (const datatype of ALL_BROWSING_DATATYPES_ON_EXIT_LIST) {
        if (getDataTypePrefNameOnExit(datatype) === option.pref.key &&
            getDataTypeCounterKey(datatype) === counterKey) {
          this.set(`moreBrowsingDataTypeOptionsList_.${i}.subLabel`, text);
          return;
        }
      }
    }
  }

  public getChangedSettings() {
    let changed: Array<{key: string, value: boolean}> = []
    const checkboxContainer = this.$.checkboxContainer
    const boxes = checkboxContainer.querySelectorAll('settings-checkbox')
    boxes.forEach((checkbox) => {
      if (checkbox.checked !== this.get(checkbox.pref!.key, this.prefs).value) {
        changed.push({key:checkbox.pref!.key, value:checkbox.checked})
      }
    })
    return changed
  }

  private updateModified_() {
    let modified = false
    const checkboxContainer = this.$.checkboxContainer
    const boxes = checkboxContainer.querySelectorAll('settings-checkbox')
    for (let checkbox of boxes) {
      if (checkbox.checked !== this.get(checkbox.pref!.key, this.prefs).value) {
        modified = true
        break
      }
    }

    if (this.isModified_ !== modified) {
      this.isModified_ = modified
      this.fire('clear-data-on-exit-page-change')
    }
  }

  /**
   * Handles clicking on the "Show More" button.
   */
  private onShowMoreClick_() {
    this.dataTypesExpanded_ = !this.dataTypesExpanded_

    // Scroll the button into view after expansion
    if (this.dataTypesExpanded_) {
      this.$.showMoreButton.scrollIntoView({behavior: 'smooth', block: 'nearest'})
    }
  }

  /**
   * Computes the label for the "Show More" button based on expansion state.
   */
  private computeShowMoreButtonLabel_(expanded: boolean): string {
    return expanded ?
        loadTimeData.getString('clearBrowsingDataShowLess') :
        loadTimeData.getString('clearBrowsingDataShowMore')
  }

  /**
   * Determines whether the "Show More" button should be hidden
   */
  private shouldHideShowMoreButton_() {
    return this.dataTypesExpanded_ || !this.moreBrowsingDataTypeOptionsList_ ||
        this.moreBrowsingDataTypeOptionsList_.length === 0;
  }
}

customElements.define(
  SettingsBraveClearBrowsingDataOnExitPageV2Element.is,
  SettingsBraveClearBrowsingDataOnExitPageV2Element)
