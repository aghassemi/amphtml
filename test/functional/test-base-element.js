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

import {listenOncePromise} from '../../src/event-helper';
import {BaseElement} from '../../src/base-element';
import {timerFor} from '../../src/timer';
import * as sinon from 'sinon';
import {createAmpElementProto} from '../../src/custom-element';

describe('BaseElement', () => {

  let sandbox;
  let div;
  let element;
  document.registerElement('amp-some-element', {
    prototype: createAmpElementProto(window, 'amp-some-element', BaseElement),
  });
  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    div = document.createElement('amp-some-element');
    element = new BaseElement(div);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('propagateAttributes - niente', () => {
    const target = document.createElement('div');
    expect(target.hasAttributes()).to.be.false;

    element.propagateAttributes(['data-test1'], target);
    expect(target.hasAttributes()).to.be.false;

    element.propagateAttributes(['data-test2', 'data-test3'], target);
    expect(target.hasAttributes()).to.be.false;
  });

  it('propagateAttributes', () => {
    const target = document.createElement('div');
    expect(target.hasAttributes()).to.be.false;

    div.setAttribute('data-test1', 'abc');
    div.setAttribute('data-test2', 'xyz');
    div.setAttribute('data-test3', '123');

    element.propagateAttributes('data-test1', target);
    expect(target.hasAttributes()).to.be.true;

    expect(target.getAttribute('data-test1')).to.equal('abc');
    expect(target.getAttribute('data-test2')).to.be.null;
    expect(target.getAttribute('data-test3')).to.be.null;

    element.propagateAttributes(['data-test2', 'data-test3'], target);
    expect(target.getAttribute('data-test2')).to.equal('xyz');
    expect(target.getAttribute('data-test3')).to.equal('123');
  });

  describe('forwardEvents', () => {
    const TIMEOUT = 1000;
    let target;
    let focusEvent;
    let blurEvent;
    let focusEventPromise;
    let blurEventPromise;

    beforeEach(() => {

      const timer = timerFor(element.win);
      target = document.createElement('input');

      focusEvent = document.createEvent('Event');
      focusEvent.initEvent('focus', false, true);

      blurEvent = document.createEvent('Event');
      blurEvent.initEvent('blur', false, true);

      focusEventPromise = listenOncePromise(element.element, 'focus');
      focusEventPromise = timer.timeoutPromise(TIMEOUT, focusEventPromise);

      blurEventPromise = listenOncePromise(element.element, 'blur');
      blurEventPromise = timer.timeoutPromise(TIMEOUT, blurEventPromise);
    });

    it('forwards single event', () => {
      element.forwardEvents('focus', target);
      target.dispatchEvent(focusEvent);
      target.dispatchEvent(blurEvent);

      return Promise.all([
        focusEventPromise,
        blurEventPromise
        .then(() => { throw new Error('Blur should not have been forwarded'); })
        .catch(() => { /* timed-out, all good */ }),
      ]);
    });

    it('forwards multiple events', () => {
      element.forwardEvents(['focus', 'blur'], target);
      target.dispatchEvent(focusEvent);
      target.dispatchEvent(blurEvent);;

      return Promise.all([
        focusEventPromise,
        blurEventPromise,
      ]);
    });
  });

  it('should register action', () => {
    const handler = () => {};
    element.registerAction('method1', handler);
    expect(element.actionMap_['method1']).to.equal(handler);
  });

  it('should fail execution of unregistered action', () => {
    expect(() => {
      element.executeAction({method: 'method1'}, false);
    }).to.throw(/Method not found/);
  });

  it('should execute registered action', () => {
    const handler = sandbox.spy();
    element.registerAction('method1', handler);
    element.executeAction({method: 'method1'}, false);
    expect(handler.callCount).to.equal(1);
  });

  it('should execute "activate" action without registration', () => {
    const handler = sandbox.spy();
    element.activate = handler;
    element.executeAction({method: 'activate'}, false);
    expect(handler.callCount).to.equal(1);
  });
});
