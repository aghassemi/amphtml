  /**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
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

import * as st from './style';
import {viewportForDoc} from './viewport';
import {vsyncFor} from './vsync';

export function installParallax(global) {
  const elements = global.document.querySelectorAll('*[parallax]');
  const viewport = viewportForDoc(global.document);
  const vsync = vsyncFor(global);
  const state = {scrollTop: 0};

  viewport.onScroll(schedule);

  function measure(state) {
    state.scrollTop = viewport.getScrollTop();
  }

  function mutate(state) {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      let factor = element.getAttribute('parallax');
      factor = factor ? parseFloat(factor) : 0.5;
      const newY = (state.scrollTop * factor).toFixed(2);
      if (newY < 0) {
        return;
      }
      st.setStyles(element, {
        transform: 'translate3d(0,' + newY + 'px,0)',
      });
    }
  }

  function schedule() {
    vsync.run({
      measure,
      mutate,
    }, state);
  }
};

