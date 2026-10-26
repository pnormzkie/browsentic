import { beforeEach, describe, expect, test } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { handlesIn } from '@/lib/secrets';
import { forgetSecrets, releaseForAction, sealForPage } from './secret-vault';

const PASSWORD = 'Tr0ub4dor&3-horse';

async function sealedOn(origin: string): Promise<string> {
  const { value } = await sealForPage({ password: PASSWORD }, origin);
  const handle = handlesIn(JSON.stringify(value))[0];
  if (!handle) throw new Error('nothing was sealed');
  return handle.text;
}

const typed = async (text: string) => {
  const release = await releaseForAction('page.fillInput', { target: { selector: '#pw' }, value: text });
  return release.unresolved.length ? 'refused' : (release.input as { value: string }).value;
};

beforeEach(async () => {
  fakeBrowser.reset();
  await forgetSecrets();
});

describe('releasing a sealed secret', () => {
  test('the handle it was sealed as becomes the secret again', async () => {
    expect(await typed(await sealedOn('bank.example'))).toBe(PASSWORD);
  });

  test('a handle rewritten to name another site resolves to nothing', async () => {
    const handle = await sealedOn('bank.example');
    expect(await typed(handle.replace('@bank.example', '@evil.example'))).toBe('refused');
  });

  test('a handle with its site taken off, or its kind changed, resolves to nothing', async () => {
    const handle = await sealedOn('bank.example');
    const kind = handlesIn(handle)[0].kind;
    expect([
      await typed(handle.replace('@bank.example', '')),
      await typed(handle.replace(`⟦${kind}:`, `⟦${kind === 'token' ? 'password' : 'token'}:`)),
    ]).toEqual(['refused', 'refused']);
  });
});
