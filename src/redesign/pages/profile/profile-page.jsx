"use client";

import { ErrorAlert } from "../../kit";
import { ClientOnly } from "../../providers/apollo";
import { AccountCard } from "./account-card";
import { PendingRequestsCard } from "./pending-requests-card";
import { ProfileDialogs } from "./profile-dialogs";
import { ProfileHeader } from "./profile-header";
import { PublicHtmlCard } from "./public-html-card";
import { useAccountEvents, useMyRequests, useProfile, useProfileRepos } from "./queries";
import { RecentChangesCard } from "./recent-changes-card";
import { ReposCard } from "./repos-card";
import { SSH_KEYS_SERVER, SshKeysCard } from "./ssh-keys-card";
import { StorageCard } from "./storage-card";

const LOADING_REQUESTS = { all: [], pending: [], pendingShell: null, pendingPublicHtml: null, pendingQuotaFor: () => null, loading: true };
const LOADING_EVENTS = { rows: [], loading: true, error: null };
const LOADING_REPOS = { repos: [], loading: true, error: null };

/** /myprofile */
export function ProfilePage() {
  return (
    <ClientOnly fallback={<ProfileFrame loading />}>
      <ProfileLive />
    </ClientOnly>
  );
}

function ProfileLive() {
  const profile = useProfile();
  const requests = useMyRequests();
  const events = useAccountEvents();
  const repos = useProfileRepos();
  return <ProfileFrame profile={profile} requests={requests} events={events} repos={repos} />;
}

/** Layout: header, then a growing left column and a 420px right column (Paper "My profile"). */
function ProfileFrame({ loading: frameLoading = false, profile, requests = LOADING_REQUESTS, events = LOADING_EVENTS, repos = LOADING_REPOS }) {
  const me = profile?.me ?? null;
  const loading = frameLoading || !!profile?.loading;
  const failed = !loading && !me;
  const live = !frameLoading;

  return (
    <div className="tw:flex tw:flex-col tw:gap-6 tw:pt-2">
      <ProfileHeader me={me} loading={loading} />
      {failed && <ErrorAlert error={profile?.error ?? new Error("No profile returned")} onRetry={profile?.refetch} what="your profile" />}
      {!failed && (
        <div className="tw:flex tw:flex-col tw:items-start tw:gap-5 tw:lg:flex-row">
          <div className="tw:flex tw:w-full tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-5">
            <AccountCard me={me} loading={loading} pendingShell={requests.pendingShell} />
            <ReposCard data={repos} />
            {live && SSH_KEYS_SERVER && me && <SshKeysCard username={me.username} />}
          </div>
          <div className="tw:flex tw:w-full tw:shrink-0 tw:flex-col tw:gap-5 tw:lg:w-105">
            <StorageCard me={me} loading={loading} pendingQuotaFor={requests.pendingQuotaFor} />
            <PublicHtmlCard me={me} loading={loading} pending={requests.pendingPublicHtml} />
            <PendingRequestsCard requests={requests} />
            <RecentChangesCard events={events} />
          </div>
        </div>
      )}
      {live && <ProfileDialogs me={me} pendingShell={requests.pendingShell} pendingPublicHtml={requests.pendingPublicHtml} />}
    </div>
  );
}
