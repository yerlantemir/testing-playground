/* global chrome */
import React, { useEffect, useState } from 'react';
import { messages } from '../constants';
import { ShieldIcon } from '@primer/octicons-react';

const colors = ['bg-blue-600', 'bg-yellow-600', 'bg-orange-600', 'bg-red-600'];

function Code({ children }) {
  return <span className="font-bold font-mono">{children}</span>;
}

const IS_DEVTOOL = !!(window.chrome && chrome.runtime && chrome.runtime.id);

const levels = {
  Role: 0,
  LabelText: 0,
  PlaceholderText: 0,
  Text: 0,
  DisplayValue: 0,
  AltText: 1,
  Title: 1,
  TestId: 2,
  generic: 3,
};

function ResultSuggestion({ queries, result, dispatch }) {
  const suggestion = Object.values(queries).find(Boolean);
  const used = result?.expression || {};

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [copied]);

  if (!suggestion) {
    return `Hmpf. I'm afraid I don't have any suggestions for you.`;
  }

  const usingAdvisedMethod = suggestion.queryMethod === used.method;
  const nameOption = suggestion.queryArgs[1]?.name;
  const hasNameArg = nameOption && used.args?.[1]?.includes('name');

  const level = levels[suggestion.queryName] ?? 3;
  const color = usingAdvisedMethod ? 'bg-green-600' : colors[level];

  const target = result?.target || {};

  let message;

  if (level < used.level) {
    message = (
      <p>
        You&apos;re using <Code>{used.method}</Code>, which falls under{' '}
        <Code>{messages[used.level].heading}</Code>. Upgrading to{' '}
        <Code>{suggestion.queryMethod}</Code> is recommended.
      </p>
    );
  } else if (level === 0 && suggestion.queryMethod !== used.method) {
    message = (
      <p>
        Nice! <Code>{used.method}</Code> is a great selector! Using{' '}
        <Code>{suggestion.queryMethod}</Code> would still be preferable though.
      </p>
    );
  } else if (target.tagName === 'INPUT' && !target.getAttribute('type')) {
    message = (
      <p>
        You can unlock <Code>getByRole</Code> by adding the{' '}
        <Code>type=&quot;text&quot;</Code> attribute explicitly. Accessibility
        will benefit from it.
      </p>
    );
  } else if (
    level === 0 &&
    suggestion.queryMethod === 'getByRole' &&
    !nameOption
  ) {
    message = (
      <p>
        Awesome! This is great already! You could still make the query a bit
        more specific by adding the name option. This would require to add some
        markup though, as your element isn&apos;t named properly.
      </p>
    );
  } else if (
    level === 0 &&
    suggestion.queryMethod === 'getByRole' &&
    nameOption &&
    !hasNameArg
  ) {
    message = (
      <p>
        There is one thing though. You could make the query a bit more specific
        by adding the name option.
      </p>
    );
  } else if (used.level > 0) {
    message = (
      <p>
        This isn&apos;t great, but we can&apos;t do better with the current
        markup. Extend your html to improve accessibility and unlock better
        queries.
      </p>
    );
  } else {
    message = <p>This is great. Ship it!</p>;
  }

  async function attemptCopyToClipboard(suggestion) {
    try {
      if (!IS_DEVTOOL && 'clipboard' in navigator) {
        await navigator.clipboard.writeText(suggestion);
        return true;
      }

      const input = Object.assign(document.createElement('input'), {
        type: 'text',
        value: suggestion,
      });

      document.body.append(input);
      input.select();
      document.execCommand('copy');
      input.remove();

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  async function handleCopyClick() {
    let text = suggestion.snippet;
    let textToCopy = text;
    if (typeof text === 'function') {
      textToCopy = text();
    }
    textToCopy = textToCopy.replace('screen.get', 'cy.find');
    const wasSuccessfullyCopied = await attemptCopyToClipboard(textToCopy);
    if (wasSuccessfullyCopied) {
      setCopied(true);
    }
    dispatch({
      type: 'SET_QUERY',
      query: suggestion.snippet,
    });
  }

  return (
    <div className="space-y-4 text-sm">
      <div
        className={['text-white p-4 rounded space-y-2', color].join(' ')}
        onClick={handleCopyClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="font-bold text-xs">suggested query</div>
        {suggestion.excerpt && (
          <div className="flex justify-between">
            <div className="font-mono cursor-pointer text-xs">
              &gt; {suggestion.excerpt}
              <br />
            </div>
          </div>
        )}
        {copied && <div style={{ fontSize: 30, color: 'red' }}>COPIED!!</div>}
      </div>
      <div className="min-h-8">{message}</div>
      {suggestion.warning && (
        <div className="min-h-8 text-yellow-700">
          <ShieldIcon />
          {suggestion.warning}
        </div>
      )}
    </div>
  );
}

export default ResultSuggestion;
