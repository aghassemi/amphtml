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

import {toArray} from '../../../src/types';

export class AmpFilter extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

  }

  /** @override */
  isLayoutSupported() {
    return true;
  }

  /** @override */
  buildCallback() {

  }

  /** @override */
  mutatedAttributesCallback(mutations) {
    if (mutations['sort-by'] || mutations['sort-direction']) {
      this.sort_();
    }
  }
}

/** @enum {string} */
const OPERATOR = {
  OR: 'or',
  AND: 'and',
};

class AbstractAmpCondition {
  evaluate() {};
}

class AmpConditions extends AbstractAmpCondition {
  constructor(conditions, operator) {
    this.operator_ = operator;
    this.conditions_ = conditions;
  }

  /*
   * @override
   **/
  evaluate() {
    if (this.conditions_.length == 0) {
      return true;
    }
    for (let i = 0; i < this.conditions_.length; i++) {

    }
  }

}

AMP.registerElement('amp-filter', AmpFilter);
AMP.registerElement('amp-filter-condition', AmpFilterCondition);
AMP.registerElement('amp-filter-condition-group', AmpFilterConditionGroup);