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

import * as mustache from '../../../../third_party/mustache/mustache';
import * as purifier from '../../../../src/purifier';
import * as service from '../../../../src/service';
import {AmpMustache} from '../amp-mustache';

describe('amp-mustache 0.2', () => {
  let sandbox;
  let templateElement;
  let template;
  let viewerCanRenderTemplates = false;

  beforeEach(() => {
    sandbox = sinon.sandbox;
    templateElement = document.createElement('template');
    const getServiceForDocStub = sandbox.stub(service, 'getServiceForDoc');
    getServiceForDocStub.returns({
      canRenderTemplates: () => viewerCanRenderTemplates,
    });

    template = new AmpMustache(templateElement);
  });

  afterEach(() => sandbox.restore());

  it('should render', () => {
    templateElement.content.textContent = 'value = {{value}}';
    template.compileCallback();
    const result = template.render({value: 'abc'});
    expect(result./*OK*/innerHTML).to.equal('value = abc');
  });

  it('should render {{.}} from string', () => {
    templateElement.content.textContent = 'value = {{.}}';
    template.compileCallback();
    const result = template.render('abc');
    expect(result./*OK*/innerHTML).to.equal('value = abc');
  });

  it('should sanitize output', () => {
    templateElement./*OK*/innerHTML =
        'value = <a href="{{value}}">abc</a>';
    template.compileCallback();
    const result = template.render({
      value: /*eslint no-script-url: 0*/ 'javascript:alert();',
    });
    expect(result./*OK*/innerHTML).to.equal(
        'value = <a target="_top">abc</a>');
  });

  it('should sanitize templated tag names', () => {
    templateElement./*OK*/innerHTML =
        'value = <{{value}} href="javascript:alert(0)">abc</{{value}}>';
    template.compileCallback();
    const result = template.render({
      value: 'a',
    });
    expect(result./*OK*/innerHTML).to.not
        .equal('<a href="javascript:alert(0)">abc</a>');
    expect(result.firstElementChild).to.be.null;
  });

  describe('Sanitizing data- attributes', () => {

    it('should sanitize templated attribute names', () => {
      templateElement./*OK*/innerHTML =
          'value = <a {{value}}="javascript:alert(0)">abc</a>';
      template.compileCallback();
      const result = template.render({
        value: 'href',
      });
      expect(result).to.not.equal('<a href="javascript:alert(0)">abc</a>');
      expect(result.firstElementChild.getAttribute('href')).to.be.null;
    });

    it('should sanitize templated bind attribute names', () => {
      templateElement./*OK*/innerHTML =
          'value = <p [{{value}}]="javascript:alert()">ALERT</p>';
      template.compileCallback();
      const result = template.render({
        value: 'onclick',
      });
      expect(result).to.not
          .equal('<p [onclick]="javascript:alert()">ALERT</p>');
      expect(result.firstElementChild.getAttribute('[onclick]')).to.be.null;
      expect(result.firstElementChild.getAttribute('onclick')).to.be.null;
    });

    it('should parse data-&style=value output correctly', () => {
      templateElement./*OK*/innerHTML = 'value = <a href="{{value}}"' +
          ' data-&style="color:red;">abc</a>';
      template.compileCallback();
      const result = template.render({
        value: /*eslint no-script-url: 0*/ 'javascript:alert();',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'value = <a target="_top">abc</a>');
    });

    it('should parse data-&attr=value output correctly', () => {
      templateElement./*OK*/innerHTML =
          'value = <a data-&href="{{value}}">abc</a>';
      template.compileCallback();
      const result = template.render({
        value: 'https://google.com/',
      });
      expect(result./*OK*/innerHTML).to.equal('value = <a>abc</a>');
    });

    it('should allow for data-attr=value to output correctly', () => {
      templateElement./*OK*/innerHTML = 'value = ' +
          '<a data-my-attr="{{invalidValue}}" data-my-id="{{value}}">abc</a>';
      template.compileCallback();
      const result = template.render({
        value: 'myid',
        invalidValue: /*eslint no-script-url: 0*/ 'javascript:alert();',
      });
      expect(result./*OK*/innerHTML).to.equal('value = ' +
          '<a data-my-id="myid" data-my-attr="javascript:alert();">abc</a>');
    });
  });

  describe('Rendering Form Fields', () => {
    it('should allow rendering inputs', () => {
      templateElement./*OK*/innerHTML = 'value = ' +
          '<input value="{{value}}" onchange="{{invalidValue}}">';
      template.compileCallback();
      const result = template.render({
        value: 'myid',
        invalidValue: /*eslint no-script-url: 0*/ 'javascript:alert();',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'value = <input value="myid">');
    });

    it('should allow rendering textarea', () => {
      templateElement./*OK*/innerHTML = 'value = ' +
          '<textarea>{{value}}</textarea>';
      template.compileCallback();
      const result = template.render({
        value: 'Cool story bro.',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'value = <textarea>Cool story bro.</textarea>');
    });

    it('should not allow image/file input types rendering', () => {
      templateElement./*OK*/innerHTML = 'value = ' +
          '<input value="{{value}}" type="{{type}}">';
      template.compileCallback();
      allowConsoleError(() => {
        const result = template.render({
          value: 'myid',
          type: 'image',
        });
        expect(result./*OK*/innerHTML).to.equal(
            'value = <input value="myid">');
      });

      allowConsoleError(() => {
        const result = template.render({
          value: 'myid',
          type: 'button',
        });
        expect(result./*OK*/innerHTML).to.equal(
            'value = <input value="myid">');
      });

      const fileResult = template.render({
        value: 'myid',
        type: 'file',
      });
      expect(fileResult./*OK*/innerHTML).to.equal(
          'value = <input type="file" value="myid">');

      const passwordResult = template.render({
        value: 'myid',
        type: 'password',
      });
      expect(passwordResult./*OK*/innerHTML).to.equal(
          'value = <input type="password" value="myid">');
    });

    it('should allow text input type rendering', () => {
      templateElement./*OK*/innerHTML = 'value = ' +
          '<input value="{{value}}" type="{{type}}">';
      template.compileCallback();
      const result = template.render({
        value: 'myid',
        type: 'text',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'value = <input type="text" value="myid">');
    });

    it('should sanitize form-related attrs properly', () => {
      templateElement./*OK*/innerHTML = 'value = ' +
          '<input value="{{value}}" ' +
          'formaction="javascript:javascript:alert(1)" ' +
          'formmethod="get" form="form1" formtarget="blank" formnovalidate ' +
          'formenctype="">';
      template.compileCallback();
      allowConsoleError(() => {
        const result = template.render({
          value: 'myid',
        });
        expect(result./*OK*/innerHTML).to.equal(
            'value = <input value="myid">');
      });
    });

    it('should not sanitize form tags', () => {
      templateElement./*OK*/innerHTML = 'value = ' +
          '<form><input value="{{value}}"></form><input value="hello">';
      template.compileCallback();
      const result = template.render({
        value: 'myid',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'value = <form><input value="myid"></form><input value="hello">');
    });
  });

  describe('Nested templates', () => {
    it('should not sanitize nested amp-mustache templates', () => {
      templateElement./*OK*/innerHTML =
          'text before a template ' +
          '<template type="amp-mustache">text inside template</template> ' +
          'text after a template';
      template.compileCallback();
      const result = template.render({});
      expect(result./*OK*/innerHTML).to.equal(
          'text before a template ' +
          '<template type="amp-mustache">text inside template</template> ' +
          'text after a template');
    });

    it('should sanitize nested templates without type="amp-mustache"', () => {
      templateElement./*OK*/innerHTML =
          'text before a template ' +
          '<template>text inside template</template> ' +
          'text after a template';
      template.compileCallback();
      const result = template.render({});
      expect(result./*OK*/innerHTML).to.equal(
          'text before a template  text after a template');
    });

    it('should not render variables inside a nested template', () => {
      templateElement./*OK*/innerHTML =
          'outer: {{outerOnlyValue}} {{mutualValue}} ' +
          '<template type="amp-mustache">nested: {{nestedOnlyValue}}' +
          ' {{mutualValue}}</template>';
      template.compileCallback();
      const result = template.render({
        outerOnlyValue: 'Outer',
        mutualValue: 'Mutual',
        nestedOnlyValue: 'Nested',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'outer: Outer Mutual ' +
          '<template type="amp-mustache">nested: {{nestedOnlyValue}}' +
          ' {{mutualValue}}</template>');
    });

    it('should compile and render nested templates when invoked', () => {
      const outerTemplateElement = document.createElement('template');
      outerTemplateElement./*OK*/innerHTML =
          'outer: {{value}} ' +
          '<template type="amp-mustache">nested: {{value}}</template>';
      const outerTemplate = new AmpMustache(outerTemplateElement);
      outerTemplate.compileCallback();
      const outerResult = outerTemplate.render({
        value: 'Outer',
      });
      const nestedTemplateElement = outerResult.querySelector('template');
      const nestedTemplate = new AmpMustache(nestedTemplateElement);
      nestedTemplate.compileCallback();
      const nestedResult = nestedTemplate.render({
        value: 'Nested',
      });
      expect(nestedResult./*OK*/innerHTML).to.equal('nested: Nested');
    });

    it('should sanitize the inner template when it gets rendered', () => {
      const outerTemplateElement = document.createElement('template');
      outerTemplateElement./*OK*/innerHTML =
          'outer: {{value}} ' +
          '<template type="amp-mustache">' +
          '<div onclick="javascript:alert(\'I am evil\')">nested</div>: ' +
          '{{value}}</template>';
      const outerTemplate = new AmpMustache(outerTemplateElement);
      outerTemplate.compileCallback();
      const outerResult = outerTemplate.render({
        value: 'Outer',
      });
      const nestedTemplateElement = outerResult.querySelector('template');
      const nestedTemplate = new AmpMustache(nestedTemplateElement);
      nestedTemplate.compileCallback();
      const nestedResult = nestedTemplate.render({
        value: 'Nested',
      });
      expect(nestedResult./*OK*/innerHTML).to.equal(
          '<div>nested</div>: Nested');
    });

    it('should not allow users to pass data having key that starts with ' +
        '__AMP_NESTED_TEMPLATE_0 when there is a nested template', () => {
      templateElement./*OK*/innerHTML =
          'outer: {{value}} ' +
          '<template type="amp-mustache">nested: {{value}}</template>';
      template.compileCallback();
      const result = template.render({
        __AMP_NESTED_TEMPLATE_0: 'MUST NOT RENDER THIS',
        value: 'Outer',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'outer: Outer ' +
          '<template type="amp-mustache">nested: {{value}}</template>');
    });

    it('should render user data with a key __AMP_NESTED_TEMPLATE_0 when' +
        ' there are no nested templates, even though it is not a weird name' +
        ' for a template variable', () => {
      templateElement./*OK*/innerHTML = '{{__AMP_NESTED_TEMPLATE_0}}';
      template.compileCallback();
      const result = template.render({
        __AMP_NESTED_TEMPLATE_0: '123',
      });
      expect(result./*OK*/innerHTML).to.equal('123');
    });

    // Need to test this since DOMPurify doesn't have an required-attribute tag
    // whitelist API. Instead, we hack around it with custom hooks.
    it('should not allow unsupported templates after a supported one', () => {
      const html =
          '1<template type="amp-mustache">2</template>3<template>4</template>5';
      templateElement./*OK*/innerHTML = '{{{html}}}';
      template.compileCallback();
      const result = template.render({html});
      expect(result./*OK*/innerHTML).to.equal(
          '1<template type="amp-mustache">2</template>35');
    });
  });

  describe('triple-mustache', () => {
    it('should sanitize text formatting elements', () => {
      templateElement.content.textContent = 'value = {{{value}}}';
      template.compileCallback();
      const result = template.render({
        value: '<b>abc</b><img><div>def</div>'
            + '<br><code></code><del></del><em></em>'
            + '<i></i><ins></ins><mark></mark><s></s>'
            + '<small></small><strong></strong><sub></sub>'
            + '<sup></sup><time></time><u></u>',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'value = <b>abc</b><div>def</div>'
           + '<br><code></code><del></del><em></em>'
           + '<i></i><ins></ins><mark></mark><s></s>'
           + '<small></small><strong></strong><sub></sub>'
           + '<sup></sup><time></time><u></u>'
      );
    });

    it('should sanitize table related elements and anchor tags', () => {
      templateElement.content.textContent = 'value = {{{value}}}';
      template.compileCallback();
      const result = template.render({
        value: '<table class="valid-class">'
            + '<caption>caption</caption>'
            + '<thead><tr><th colspan="2">header</th></tr></thead>'
            + '<tbody><tr><td>'
            + '<a href="http://www.google.com">google</a>'
            + '</td></tr></tbody>'
            + '<tfoot><tr>'
            + '<td colspan="2"><span>footer</span></td>'
            + '</tr></tfoot>'
            + '</table>',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'value = <table class="valid-class">'
          + '<caption>caption</caption>'
          + '<thead><tr><th colspan="2">header</th></tr></thead>'
          + '<tbody><tr><td>'
          + '<a target="_top" href="http://www.google.com/">google</a>'
          + '</td></tr></tbody>'
          + '<tfoot><tr>'
          + '<td colspan="2"><span>footer</span></td>'
          + '</tr></tfoot>'
          + '</table>'
      );
    });

    it('should sanitize tags, removing unsafe attributes', () => {
      templateElement.content.textContent = 'value = {{{value}}}';
      template.compileCallback();
      const result = template.render({
        value: '<a href="javascript:alert(\'XSS\')">test</a>'
            + '<img src="x" onerror="alert(\'XSS\')" />',
      });
      expect(result./*OK*/innerHTML).to.equal(
          'value = <a>test</a>');
    });
  });

  describe('viewer can render templates', () => {
    beforeEach(() => {
      viewerCanRenderTemplates = true;
    });

    it('should not call mustache parsing', () => {
      sandbox.spy(mustache, 'parse');
      template.compileCallback();
      expect(mustache.parse).to.have.not.been.called;
    });

    it('should not mustache render but still purify html', () => {
      sandbox.spy(purifier, 'purifyHtml');
      sandbox.spy(mustache, 'render');
      template.render();
      expect(mustache.render).to.have.not.been.called;
      expect(purifier.purifyHtml).to.have.been.called;
    });
  });

  it('should unwrap output', () => {
    templateElement./*OK*/innerHTML = '<a>abc</a>';
    template.compileCallback();
    const result = template.render({});
    expect(result.tagName).to.equal('A');
    expect(result./*OK*/innerHTML).to.equal('abc');
  });
});
