// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { GospelAwarenessPrompts } from '@/components/formation/GospelAwarenessPrompts';
import { buildGospelAwarenessReading } from '@/domain/formation/gospelAwareness';
import { AwarenessCircuitEditor } from '@/components/formation/CircuitEditors';
import { createEmptyCircuitDraft } from '@/domain/formation/circuits';
import { evaluateCircuit } from '@/domain/formation/circuitRules';
vi.mock('@/data/formation/formationProof', () => ({ deleteFormationProof: vi.fn(), sanitizeFormationProof: vi.fn(), uploadFormationProof: vi.fn(), validateFormationProofFile: vi.fn() }));
afterEach(cleanup);
const reading = buildGospelAwarenessReading('John 13:1-17');
describe('Gospel Awareness presentation', () => {
  it('shows the assigned passage, ordered prompts, and explicit draft label', () => {
    render(createElement(GospelAwarenessPrompts, { reading, draft: true }));
    expect(screen.getByText('John 13:1-17 (NLT)')).toBeTruthy();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map(item => item.textContent)).toEqual([`Observe: ${reading.observe}`, `Understand: ${reading.understand}`, `Respond: ${reading.respond}`]);
    expect(screen.getByText(/pending independent theological review/)).toBeTruthy();
    expect(screen.getByText(/not a Scripture quotation/)).toBeTruthy();
  });
  it('uses the existing private honest-truth response and does not add completion requirements', () => {
    const draft = createEmptyCircuitDraft(); const onChange = vi.fn();
    render(createElement(AwarenessCircuitEditor, { userId: 'user', localDate: '2026-10-19', track: 'fully_charged_75', draft, evaluation: evaluateCircuit('fully_charged_75', 'awareness', draft), history: [], localOnly: false, onChange, gospelAwareness: reading }));
    expect(screen.getByTestId('gospel-awareness-prompts')).toBeTruthy();
    expect(screen.queryByText(/pending independent theological review/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/One honest truth/), { target: { value: 'Private response' } });
    expect(onChange.mock.calls[0][0].fields.honestTruth).toBe('Private response');
    expect(evaluateCircuit('fully_charged_75', 'awareness', { ...draft, fields: { honestTruth: 'Private response' }, actions: { scripture_opened: true, reading_completed: true } }).isSatisfiedForTrack).toBe(true);
  });
  it('does not introduce draft Gospel prompts into other tracks or legacy published assignments', () => {
    const draft = createEmptyCircuitDraft();
    const props = { userId: 'user', localDate: '2026-10-19', track: 'read_along' as const, draft, evaluation: evaluateCircuit('read_along', 'awareness', draft), history: [], localOnly: false, onChange: vi.fn(), gospelAwareness: reading };
    const view = render(createElement(AwarenessCircuitEditor, props));
    expect(screen.queryByTestId('gospel-awareness-prompts')).toBeNull();
    view.rerender(createElement(AwarenessCircuitEditor, { ...props, track: 'fully_charged_75', gospelAwareness: null }));
    expect(screen.queryByTestId('gospel-awareness-prompts')).toBeNull();
  });
});
