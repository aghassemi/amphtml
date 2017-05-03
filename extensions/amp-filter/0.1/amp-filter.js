/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {CSS} from '../../../build/amp-filter-0.1.css';
import {dev, user} from '../../../src/log';
import {Observable} from '../../../src/observable';
import {childElementsByTag, scopedQuerySelectorAll} from '../../../src/dom';
import {toArray} from '../../../src/types';

export class AmpFilter extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);
    this.conditions_ = [];
    this.operator_;

  }

  /** @override */
  isLayoutSupported() {
    return true;
  }

  /** @override */
  renderOutsideViewport() {
    return true;
  }

  buildCallback() {
    this.operator_ = this.element.getAttribute('operator') || OPERATOR.or;
  }
  layoutCallback() {
    const directConditions = toArray(childElementsByTag(this.element,
        'amp-filter-condition'));
    const directGroups = toArray(childElementsByTag(this.element,
        'amp-filter-condition-group'));

    this.conditions_ = directConditions.concat(directGroups).map(elem => {
      //TODO this is very wrong but getResourceFor returns the base class for some reason
      return elem.implementation_;
    });

    this.conditions_.forEach(cond => {
      cond.onToggle.add(this.reevaluate_.bind(this));
    });

    return Promise.resolve();
  }

  reevaluate_() {
    this.getVsync().mutate(() => {
      this.reset_();
      let hasAnyActiveConditions = false;
      const results = [];
      this.conditions_.forEach(cond => {
        if (!cond.isActive()) {
          return;
        }

        hasAnyActiveConditions = true;

        const attrs = cond.getTargetSelector();
        const elements = toArray(scopedQuerySelectorAll(this.element, attrs.join(' ')));
        elements.forEach(elem => {
          if (elem.hasAttribute('amp-filter-exclude')) {
            return;
          }
          results.push(elem);
          const match = cond.evaluate(elem);
          if (elem.__amp_filter_match == undefined) {
            // TODO do not add property to element. use a different data structure to keep track
            elem.__amp_filter_match = match;
          } else {
            if (this.operator_ == OPERATOR.or) {
              elem.__amp_filter_match = elem.__amp_filter_match || match;
            } else {
              elem.__amp_filter_match = elem.__amp_filter_match && match;
            }
          }
        });
      });

      results.forEach(elem => {
        const match = elem.__amp_filter_match;
        elem.setAttribute(match ? 'amp-filter-matched' : 'amp-filter-unmatched', '');
        elem.setAttribute('aria-hidden', match ? 'false' : 'true');
      });

      if (hasAnyActiveConditions) {
        this.element.setAttribute('filtered', '');
      }
    });
  }

  reset_() {
    this.element.removeAttribute('filtered');
    const elements = toArray(scopedQuerySelectorAll(this.element,
      '[amp-filter-unmatched], [amp-filter-matched]'));
    elements.forEach(elem => {
      elem.removeAttribute('amp-filter-unmatched');
      elem.removeAttribute('amp-filter-matched');
      elem.removeAttribute('aria-hidden');
      delete elem.__amp_filter_match;
    });
  }

  /** @override */
  mutatedAttributesCallback(mutations) {
    const operator = mutations['operator'];
    if (operator) {
      this.operator_ = operator;
    }
  }

}

/** @enum {string} */
const OPERATOR = {
  or: 'or',
  and: 'and',
};

class AbstractAmpFilterCondition extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);
    this.onToggle = new Observable();
  }

  evaluate(unusedTarget) {};
  isActive() {};
  getTargetSelector() {};
}

class AmpFilterCondition extends AbstractAmpFilterCondition {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);
    this.isActive_ = false;
  }

  /** @override */
  isLayoutSupported() {
    return true;
  }

  /** @override */
  buildCallback() {
    this.registerAction('toggle', invocation => {
      const args = invocation.args;
      let active = this.isActive_;
      if (args) {
        if (args['on'] !== undefined) {
          // support 0, 1, true, false, "0", "1", "true", "false"
          switch (args['on']) {
            case 0:
            case false:
            case '0':
            case 'false':
              active = false;
              break;
            case 1:
            case true:
            case '1':
            case 'true':
              active = true;
              break;
            default:
              user().error('wrong args value');
              return;
          }
        }
      }
      this.toggle_(active);
    });
  }

  toggle_(active) {
    this.isActive_ = active;
    this.onToggle.fire();
  }

  /*
   * @override
   **/
  evaluate(target) {
    //TODO support bind expressions and value-type
    const attr = this.element.getAttribute('attr');
    const condition = this.element.getAttribute('condition');

    dev().assert(target.hasAttribute(attr));
    const targetVal = target.getAttribute(attr);
    return targetVal == condition;
  }

  isActive() {
    return this.isActive_;
  };

  getTargetSelector() {
    return ['[' + this.element.getAttribute('attr') + ']'];
  };
}

AMP.registerElement('amp-filter', AmpFilter, CSS);
AMP.registerElement('amp-filter-condition', AmpFilterCondition);
