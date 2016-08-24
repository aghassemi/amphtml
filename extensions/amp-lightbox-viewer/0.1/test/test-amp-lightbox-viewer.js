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


import {ancestorElements} from '../../../../src/dom';
import {adopt} from '../../../../src/runtime';
import {createIframePromise} from '../../../../testing/iframe';
import {toggleExperiment} from '../../../../src/experiments';
import {maybeInstallLightboxManager} from '../amp-lightbox-viewer';

adopt(window);

describe('amp-lightbox-viewer', () => {
  let item1; // Auto lightboxable
  let item2; // Manually lightboxable
  let item3; // Not lightboxable
  let item4; // Auto lightboxable

  describe('with manual lightboxing', () => {
    runTests(/*autoLightbox*/false);
  });

  describe('with auto lightboxing', () => {
    runTests(/*autoLightbox*/true);
  });

  function runTests(autoLightbox) {
    it('should build', () => {
      return getAmpLightboxViewer(autoLightbox).then(viewer => {
        const container = viewer.querySelector('.-amp-lightbox-viewer');
        expect(container).to.exist;

        const mask = viewer.querySelector('.-amp-lightbox-viewer-mask');
        expect(mask).to.exist;

        const btns = viewer.querySelectorAll('[role=button]');
        expect(btns.length).to.equal(3);
        expect(btns[0].className).to.equal('amp-lightbox-viewer-button-next');
        expect(btns[1].className).to.equal('amp-lightbox-viewer-button-prev');
        expect(btns[2].className).to.equal('amp-lightbox-viewer-button-close');
      });
    });

    it('should lightbox item on activate', () => {
      return getAmpLightboxViewer(autoLightbox).then(viewer => {
        const impl = viewer.implementation_;

        assertLightboxed(item1, impl, false, /*closed*/ true);
        assertControls(viewer, /*hasPrevious*/ false, /*hasNext*/ false);
        return impl.activate({source: item1}).then(() => {
          assertLightboxed(item1, impl, true, /*closed*/ false);
          assertControls(viewer, /*hasPrevious*/ false, /*hasNext*/ true);
        });
      });
    });

    it('should unlightbox item on close', () => {
      return getAmpLightboxViewer(autoLightbox).then(viewer => {
        const impl = viewer.implementation_;

        assertLightboxed(item1, impl, false, /*closed*/ true);
        assertControls(viewer, /*hasPrevious*/ false, /*hasNext*/ false);
        return impl.activate({source: item1}).then(() => {
          assertLightboxed(item1, impl, true, /*closed*/ false);
          assertControls(viewer, /*hasPrevious*/ false, /*hasNext*/ true);
        }).then(() => {
          return impl.close_();
        }).then(() => {
          assertLightboxed(item1, impl, false, /*closed*/ true);
          assertControls(viewer, /*hasPrevious*/ false, /*hasNext*/ false);
        });
      });
    });

    it('should lightbox next/previous elements', () => {
      return getAmpLightboxViewer(autoLightbox).then(viewer => {
        const impl = viewer.implementation_;

        assertLightboxed(item1, impl, false, /*closed*/ true);
        impl.activate({source: item1});
        assertLightboxed(item1, impl, true, /*closed*/ false);
        // Should go to item2
        return impl.next_().then(() => {
          assertLightboxed(item1, impl, false, /*closed*/ false);
          assertLightboxed(item2, impl, true, /*closed*/ false);
          assertLightboxed(item3, impl, false, /*closed*/ false);
          assertLightboxed(item4, impl, false, /*closed*/ false);
          assertControls(viewer, /*hasPrevious*/ true, /*hasNext*/ true);
        }).then(() => {
          // Should skip item3 since it is not lightboxable
          return impl.next_();
        }).then(() => {
          assertLightboxed(item1, impl, false, /*closed*/ false);
          assertLightboxed(item2, impl, false, /*closed*/ false);
          assertLightboxed(item3, impl, false, /*closed*/ false);
          assertLightboxed(item4, impl, true, /*closed*/ false);
          assertControls(viewer, /*hasPrevious*/ true, /*hasNext*/ false);
        }).then(() => {
          // Should be a no-op now that we are at the end of the roll
          return impl.next_();
        }).then(() => {
          assertLightboxed(item1, impl, false, /*closed*/ false);
          assertLightboxed(item2, impl, false, /*closed*/ false);
          assertLightboxed(item3, impl, false, /*closed*/ false);
          assertLightboxed(item4, impl, true, /*closed*/ false);
          assertControls(viewer, /*hasPrevious*/ true, /*hasNext*/ false);
        }).then(() => {
          // Should go back to item2 since item3 is not lightboxable
          return impl.previous_();
        }).then(() => {
          assertLightboxed(item1, impl, false, /*closed*/ false);
          assertLightboxed(item2, impl, true, /*closed*/ false);
          assertLightboxed(item3, impl, false, /*closed*/ false);
          assertLightboxed(item4, impl, false, /*closed*/ false);
          assertControls(viewer, /*hasPrevious*/ true, /*hasNext*/ true);
        }).then(() => {
          // Should go back to item1
          return impl.previous_();
        }).then(() => {
          assertLightboxed(item1, impl, true, /*closed*/ false);
          assertLightboxed(item2, impl, false, /*closed*/ false);
          assertLightboxed(item3, impl, false, /*closed*/ false);
          assertLightboxed(item4, impl, false, /*closed*/ false);
          assertControls(viewer, /*hasPrevious*/ false, /*hasNext*/ true);
        }).then(() => {
          // Should be a no-op now that we are at the beginning of the roll
          return impl.previous_();
        }).then(() => {
          assertLightboxed(item1, impl, true, /*closed*/ false);
          assertLightboxed(item2, impl, false, /*closed*/ false);
          assertLightboxed(item3, impl, false, /*closed*/ false);
          assertLightboxed(item4, impl, false, /*closed*/ false);
          assertControls(viewer, /*hasPrevious*/ false, /*hasNext*/ true);
        }).then(() => {
          return impl.close_();
        }).then(() => {
          assertLightboxed(item1, impl, false, /*closed*/ true);
          assertLightboxed(item2, impl, false, /*closed*/ true);
          assertLightboxed(item3, impl, false, /*closed*/ true);
          assertLightboxed(item4, impl, false, /*closed*/ true);
          assertControls(viewer, /*hasPrevious*/ false, /*hasNext*/ false);
        });
      });
    });
  }

  function assertLightboxed(element, impl, isIt, closed) {
    expect(element.classList.contains('amp-lightboxed')).to.equal(isIt);

    ancestorElements(element, p => {
      expect(p.classList.contains('-amp-lightboxed-ancestor'))
        .to.equal(!closed);
    });

    if (isIt) {
      expect(impl.activeElement_).to.equal(element);
    } else {
      expect(impl.activeElement_).not.to.equal(element);
    }
  }

  function assertControls(viewer, hasPrevious, hasNext) {
    const container = viewer.querySelector('.-amp-lightbox-viewer');
    expect(container.hasAttribute('no-prev')).to.equal(!hasPrevious);
    expect(container.hasAttribute('no-next')).to.equal(!hasNext);
  }


  function setUpDocument(doc, autoLightbox) {
    const createImage = function() {
      const img = doc.createElement('amp-img');
      img.setAttribute('layout', 'responsive');
      img.setAttribute('width', '200');
      img.setAttribute('height', '200');
      img.setAttribute('src', 'someimage');
      return img;
    };

    item1 = createImage();
    if (!autoLightbox) {
      item1.setAttribute('lightbox', '');
    }

    item2 = doc.createElement('blockquote');
    item2.setAttribute('lightbox', '');

    item3 = createImage();
    if (autoLightbox) {
      item3.setAttribute('lightbox', 'none');
    }

    item4 = createImage();
    if (!autoLightbox) {
      item4.setAttribute('lightbox', '');
    }

    const container = doc.createElement('div');
    container.appendChild(item1);
    container.appendChild(item2);
    container.appendChild(item3);
    container.appendChild(item4);

    doc.body.appendChild(container);
  }

  function getAmpLightboxViewer(autoLightbox) {
    return createIframePromise().then(iframe => {
      toggleExperiment(iframe.win, 'amp-lightbox-viewer', true);
      if (autoLightbox) {
        toggleExperiment(iframe.win, 'amp-lightbox-viewer-auto', true);
      } else {
        toggleExperiment(iframe.win, 'amp-lightbox-viewer-auto', false);
      }
      setUpDocument(iframe.doc, autoLightbox);
      const viewer = iframe.doc.createElement('amp-lightbox-viewer');
      viewer.setAttribute('layout', 'nodisplay');
      maybeInstallLightboxManager(iframe.win);
      return iframe.addElement(viewer);
    });
  }
});
