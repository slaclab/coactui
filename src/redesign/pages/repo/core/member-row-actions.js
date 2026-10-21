import { Copy, Crown, Shield, ShieldOff, UserMinus, Users } from "lucide-react";
import { routes } from "../../../lib/routes";

/**
 * Registry for the member row "…" (same pattern as actions/repo-actions.js), rendered by
 * <ActionsMenu>. Gates mirror the API: role / remove need canEdit (PI, leader, czar, admin);
 * Make PI needs canManage (czar, admin). Never "Remove" or "Make PI" on the PI row.
 *
 *   memberActions(member, { repo, canEdit, canManage, busy, onToggleLeader, openDialog })
 */
export function memberActions(member, { repo, canEdit, canManage, busy, onToggleLeader, openDialog }) {
  const isPI = member.role === "PI";
  const firstGroup = member.groups[0];
  const groups = [
    canEdit &&
      !isPI && {
        key: "role",
        items: [
          member.role === "Leader"
            ? { key: "leader", label: busy ? "Updating…" : "Remove leader role", icon: ShieldOff, disabled: busy ? "Updating…" : undefined, onSelect: () => onToggleLeader(member, false) }
            : { key: "leader", label: busy ? "Updating…" : "Make leader", icon: Shield, disabled: busy ? "Updating…" : undefined, onSelect: () => onToggleLeader(member, true) },
          canManage && { key: "pi", label: "Make PI…", icon: Crown, onSelect: () => openDialog("change-pi", member.username) },
        ].filter(Boolean),
      },
    {
      key: "go",
      items: [
        { key: "groups", label: "Access groups…", icon: Users, href: `${routes.repo(repo.facility, repo.name, "groups")}${firstGroup ? `?group=${encodeURIComponent(firstGroup)}` : ""}` },
        { key: "copy", label: "Copy username", icon: Copy, copy: member.username },
      ],
    },
    canEdit &&
      !isPI && {
        key: "remove",
        items: [{ key: "remove", label: "Remove from repo…", icon: UserMinus, destructive: true, onSelect: () => openDialog("remove-member", member.username) }],
      },
  ];
  return groups.filter(Boolean).filter((g) => g.items.length);
}
