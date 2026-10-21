"use client";

import { useState } from "react";
import { Lock, Plus, ToggleRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorAlert } from "../../kit";
import { useDialogParam } from "../../lib/navigation";
import { ClientOnly } from "../../providers/apollo";
import { useViewer } from "../../providers/viewer";
import { useRepo } from "./repo-context";
import { useFeatureMutations } from "./resources/mutations";
import { useRepoFeatures } from "./resources/queries";
import { AddFeatureDialog } from "./resources/features/add-feature-dialog";
import { EditFeatureSheet } from "./resources/features/edit-feature-sheet";
import { DeleteFeatureConfirm, DisableFeatureConfirm } from "./resources/features/feature-confirms";
import { FeatureRow, FeatureRowsSkeleton } from "./resources/features/feature-row";
import { HowChangesApply, RecentFeatureChanges } from "./resources/features/feature-side-cards";

/**
 * /repos/[facility]/[name]/features (spec §6 Features + features-tab-spec.md; Paper "Repo — Features").
 * Read for everyone; add / edit / toggle / delete for Coact admins only (the API's gate).
 * Dialogs: ?dialog=add-feature | edit-feature&target=<name> | delete-feature&target=<name> | disable-feature&target=<name>.
 */
export function RepoFeaturesTab() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-5 tw:pt-6">
      <ClientOnly fallback={<FeaturesFrame editable={false} loading />}>
        <FeaturesLive />
      </ClientOnly>
    </div>
  );
}

function FeaturesHeader({ editable, onAdd }) {
  return (
    <div className="tw:flex tw:items-end tw:justify-between tw:gap-6">
      <div className="tw:flex tw:max-w-[760px] tw:flex-col tw:gap-1">
        <h2 className="tw:text-lg tw:leading-6 tw:font-semibold">Features</h2>
        <p className="tw:text-[13px] tw:leading-5 tw:text-muted-strong">
          Switches and options that coactd reads when it changes this repo’s members or compute allocation. Each option is a free-form string and is stored exactly as typed.
        </p>
      </div>
      {editable && (
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus /> Add feature
        </Button>
      )}
    </div>
  );
}

function LockAlert() {
  return (
    <Alert className="tw:border-0 tw:bg-muted">
      <Lock />
      <AlertDescription className="tw:text-[13px] tw:font-medium tw:text-foreground">Features are managed by Coact admins. Ask an admin to change them.</AlertDescription>
    </Alert>
  );
}

/** Skeleton shell used on the server and while the repo/viewer load. */
function FeaturesFrame({ editable, loading }) {
  return (
    <>
      <FeaturesHeader editable={editable} />
      {loading && (
        <ul className="tw:flex tw:flex-col tw:rounded-xl tw:border tw:bg-background">
          <FeatureRowsSkeleton rows={2} />
        </ul>
      )}
    </>
  );
}

function FeaturesLive() {
  const { repo, facility, name } = useRepo();
  const { can, loading: viewerLoading } = useViewer();
  if (!repo || viewerLoading) return <FeaturesFrame editable={false} loading />;
  return <FeaturesBody facility={facility} name={name} editable={can.canEditFeatures()} />;
}

function FeaturesBody({ facility, name, editable }) {
  const { features, loading, error, refetch } = useRepoFeatures();
  const m = useFeatureMutations();
  const { dialog, target, openDialog, closeDialog } = useDialogParam();
  // Name of the feature whose Switch write is in flight (transient UI state only).
  const [toggling, setToggling] = useState(null);

  const byName = (n) => features.find((f) => f.name === n) ?? null;
  const targetFeature = target ? byName(target) : null;
  const names = features.map((f) => f.name);

  const toggle = async (feature, on) => {
    // Turning slurm off has a real consequence on the next allocation change: confirm first.
    if (feature.name === "slurm" && !on) return openDialog("disable-feature", feature.name);
    setToggling(feature.name);
    try {
      // Options are passed through unchanged, byte-for-byte.
      await m.update({ name: feature.name, state: on, options: feature.options ?? [] });
    } catch {
      // useFeatureMutations already toasted the error; the Switch stays on the server value.
    } finally {
      setToggling(null);
    }
  };

  const count = features.length;

  return (
    <>
      <FeaturesHeader editable={editable} onAdd={() => openDialog("add-feature")} />
      {!editable && <LockAlert />}

      {error ? (
        <ErrorAlert error={error} onRetry={refetch} what="features" />
      ) : loading ? (
        <ul className="tw:flex tw:flex-col tw:rounded-xl tw:border tw:bg-background">
          <FeatureRowsSkeleton rows={2} />
        </ul>
      ) : count === 0 ? (
        <EmptyState
          icon={ToggleRight}
          title="No features enabled"
          description={editable ? "Add slurm, posixgroup or netgroup so coactd applies them on this repo’s next membership or allocation change." : "No switches or options are set on this repo."}
          actions={editable && <Button size="sm" variant="outline" onClick={() => openDialog("add-feature")}><Plus /> Add feature</Button>}
        />
      ) : (
        <div className="tw:flex tw:flex-col tw:gap-2">
          <ul className="tw:flex tw:flex-col tw:rounded-xl tw:border tw:bg-background">
            {features.map((f) => (
              <FeatureRow key={f.name} feature={f} editable={editable} pending={toggling === f.name} onToggle={toggle} onDialog={openDialog} />
            ))}
          </ul>
          {!editable && <p className="tw:text-xs tw:text-muted-strong">This repo has {count} {count === 1 ? "feature" : "features"}.</p>}
        </div>
      )}

      <div className="tw:grid tw:grid-cols-1 tw:gap-5 tw:lg:grid-cols-2">
        <HowChangesApply editable={editable} />
        <RecentFeatureChanges facility={facility} name={name} />
      </div>

      {editable && (
        <>
          <AddFeatureDialog open={dialog === "add-feature"} onClose={closeDialog} repoName={name} existing={names} onAdd={m.add} />
          <EditFeatureSheet open={dialog === "edit-feature" && !!targetFeature} onClose={closeDialog} feature={targetFeature} onSave={m.update} />
          <DeleteFeatureConfirm open={dialog === "delete-feature" && !!targetFeature} onClose={closeDialog} feature={targetFeature} onConfirm={m.remove} />
          <DisableFeatureConfirm open={dialog === "disable-feature" && !!targetFeature?.state} onClose={closeDialog} feature={targetFeature} repoName={name} onConfirm={m.update} />
        </>
      )}
    </>
  );
}
