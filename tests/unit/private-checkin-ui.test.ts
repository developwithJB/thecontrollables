// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const mocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), del: vi.fn(), delAll: vi.fn(), event: vi.fn() }));
vi.mock('@/data/wellness/privateCheckins', () => ({ CHECKIN_MOODS:['peaceful','okay','heavy','anxious','worn_out'], EMPTY_PRIVATE_CHECKIN:{sleep_rating:null,sleep_hours:null,mood:null,note:null},loadPrivateCheckin:mocks.load,savePrivateCheckin:mocks.save,deletePrivateCheckin:mocks.del,deleteAllPrivateCheckins:mocks.delAll }));
vi.mock('@/lib/growthEvents', () => ({ trackGrowthEvent: mocks.event }));
import { PrivateCheckinCard } from '@/components/wellness/PrivateCheckinCard';
import { ReviewDayInvite, REVIEW_DAY_INVITE_URL } from '@/components/formation/ReviewDayInvite';
import { FULLY_CHARGED_75_DAY_GUIDES } from '@/domain/formation/fullyChargedJourney';
function card() { return render(createElement(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},createElement(PrivateCheckinCard,{userId:'owner'}))); }
beforeEach(() => { vi.clearAllMocks(); mocks.load.mockResolvedValue(null); mocks.save.mockResolvedValue(undefined); mocks.del.mockResolvedValue(undefined); mocks.delAll.mockResolvedValue(undefined); Object.defineProperty(navigator,'share',{value:undefined,configurable:true}); Object.defineProperty(navigator,'clipboard',{value:{writeText:vi.fn().mockResolvedValue(undefined)},configurable:true}); });
afterEach(cleanup);
async function ready() { await waitFor(()=>expect(screen.queryByText('Loading private check-in…')).toBeNull()); }
describe('private Wellness check-in', () => {
  it('saves optional values without an analytics event; safety support stays local', async () => {
    card(); await ready();
    fireEvent.change(screen.getByLabelText('How are you, honestly?'),{target:{value:'heavy'}});
    expect(screen.getByRole('link',{name:'988'}).getAttribute('href')).toBe('tel:988?oai_link_source=model_response_hotline');
    fireEvent.change(screen.getByLabelText(/Private note/),{target:{value:'private note fixture'}});
    fireEvent.click(screen.getByRole('button',{name:'Save private check-in'}));
    await screen.findByText('Private check-in saved.');
    expect(mocks.save).toHaveBeenCalledWith('owner',expect.any(String),{sleep_rating:null,sleep_hours:null,mood:'heavy',note:'private note fixture'});
    expect(mocks.event).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Private check-in').className).toContain('ph-no-capture');
    fireEvent.change(screen.getByLabelText('How are you, honestly?'),{target:{value:'okay'}});
    expect(screen.queryByRole('link',{name:'988'})).toBeNull();
  });
  it('retains unsaved text on failure and offers a retry', async () => {
    mocks.save.mockRejectedValue(new Error('database fixture')); card(); await ready();
    fireEvent.change(screen.getByLabelText(/Private note/),{target:{value:'keep this locally in memory'}});
    fireEvent.click(screen.getByRole('button',{name:'Save private check-in'}));
    await screen.findByText(/Could not save this change/);
    expect((screen.getByLabelText(/Private note/) as HTMLTextAreaElement).value).toBe('keep this locally in memory');
  });
  it('requires confirmation before deleting all private dates', async () => {
    const confirm = vi.spyOn(window,'confirm').mockReturnValue(false); card(); await ready();
    fireEvent.click(screen.getByRole('button',{name:'Delete all private check-ins'})); expect(mocks.delAll).not.toHaveBeenCalled();
    confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button',{name:'Delete all private check-ins'}));
    await screen.findByText('All private check-ins deleted.'); expect(mocks.delAll).toHaveBeenCalledWith('owner'); confirm.mockRestore();
  });
  it('clears the old account editor and cached check-in on account switch', async () => {
    mocks.load.mockResolvedValueOnce({sleep_rating:null,sleep_hours:null,mood:'okay',note:'old account fixture'}).mockResolvedValue(null);
    const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
    const view = render(createElement(QueryClientProvider,{client},createElement(PrivateCheckinCard,{userId:'owner'})));
    await waitFor(()=>expect((screen.getByLabelText(/Private note/) as HTMLTextAreaElement).value).toBe('old account fixture'));
    view.rerender(createElement(QueryClientProvider,{client},createElement(PrivateCheckinCard,{userId:'another-owner'})));
    await waitFor(()=>expect((screen.getByLabelText(/Private note/) as HTMLTextAreaElement).value).toBe(''));
    await waitFor(()=>expect(client.getQueriesData({queryKey:['private-wellness-checkin','owner']})).toEqual([]));
  });
  it('keeps the feature source away from analytics and AI integrations', () => {
    for (const path of ['src/data/wellness/privateCheckins.ts','src/components/wellness/PrivateCheckinCard.tsx']) {
      const source = readFileSync(path,'utf8'); expect(source).not.toMatch(/trackGrowthEvent|trackEvent\(|posthog|functions\.invoke|localStorage/);
    }
  });
});
describe('review-day invitation', () => {
  it('renders only for the existing review-day markers', () => {
    for (const guide of FULLY_CHARGED_75_DAY_GUIDES) {
      const view = render(createElement(ReviewDayInvite,{dayNumber:guide.dayNumber}));
      expect(Boolean(screen.queryByRole('button',{name:'Invite a friend'}))).toBe(guide.reviewDay); view.unmount();
    }
  });
  it('copies only the public campaign URL when native share is unavailable', async () => {
    render(createElement(ReviewDayInvite,{dayNumber:7})); fireEvent.click(screen.getByRole('button',{name:'Invite a friend'}));
    await screen.findByText(/Invite link copied/); expect(navigator.clipboard.writeText).toHaveBeenCalledWith(REVIEW_DAY_INVITE_URL);
    expect([...new URL(REVIEW_DAY_INVITE_URL).searchParams.keys()]).toEqual(['utm_source','utm_medium','utm_campaign']);
    expect(mocks.event.mock.calls).toEqual([['share_clicked',{surface:'review_day'}],['share_completed',{method:'clipboard'}]]);
  });
  it('records completion only after native sharing resolves', async () => {
    const share = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator,'share',{value:share,configurable:true});
    render(createElement(ReviewDayInvite,{dayNumber:25})); fireEvent.click(screen.getByRole('button',{name:'Invite a friend'})); await screen.findByText('Invitation shared.');
    expect(share).toHaveBeenCalledWith({title:'The Dashboard',text:'Join me in a private daily formation practice.',url:REVIEW_DAY_INVITE_URL});
    expect(mocks.event).toHaveBeenCalledWith('share_completed',{method:'native'});
  });
  it.each(['native cancellation', 'clipboard failure'])('does not report completion after %s', async scenario => {
    if (scenario === 'native cancellation') {
      const error = new Error('cancelled'); error.name = 'AbortError';
      Object.defineProperty(navigator,'share',{value:vi.fn().mockRejectedValue(error),configurable:true});
    } else {
      Object.defineProperty(navigator,'clipboard',{value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))},configurable:true});
    }
    render(createElement(ReviewDayInvite,{dayNumber:7})); fireEvent.click(screen.getByRole('button',{name:'Invite a friend'}));
    await screen.findByText(scenario === 'native cancellation' ? 'Sharing cancelled. Nothing was posted.' : 'Could not share the invitation. Try again.');
    expect(mocks.event).not.toHaveBeenCalledWith('share_completed',expect.anything());
    if (scenario === 'native cancellation') expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
