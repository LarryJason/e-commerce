import type { Metadata } from "next";
import { Suspense } from "react";
import { toggleUserActiveAction, updateUserRoleAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { listUsers } from "@/lib/data/users";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, ROLES } from "@/lib/roles";

export const metadata: Metadata = { title: "Utilisateurs" };

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminUsersPageContent />
    </Suspense>
  );
}

async function AdminUsersPageContent() {
  const admin = await requireRole(["admin"], "/admin/utilisateurs");
  const users = await listUsers();

  return (
    <>
      <PageHeader title="Utilisateurs" />
      <div className="bg-base-100 rounded-box border-base-300 overflow-x-auto border">
        <table className="table">
          <caption className="sr-only">Liste des utilisateurs</caption>
          <thead>
            <tr>
              <th scope="col">Utilisateur</th>
              <th scope="col">Inscription</th>
              <th scope="col">Activité</th>
              <th scope="col">Rôle</th>
              <th scope="col">Compte</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === admin.id;
              return (
                <tr key={u.id} className={u.is_active ? "" : "opacity-60"}>
                  <th scope="row">
                    <div className="font-semibold">
                      {u.name} {isSelf && <span className="badge badge-sm badge-outline">vous</span>}
                    </div>
                    <div className="text-muted text-xs font-normal">{u.email}</div>
                  </th>
                  <td className="whitespace-nowrap">{formatDate(u.created_at)}</td>
                  <td className="text-sm">
                    {u.product_count} produit(s)
                    <br />
                    {u.order_count} commande(s)
                  </td>
                  <td>
                    {isSelf ? (
                      ROLE_LABELS[u.role]
                    ) : (
                      <ActionForm
                        key={u.role}
                        action={updateUserRoleAction}
                        fields={{ userId: u.id }}
                        submitLabel="Changer"
                        submitClassName="btn btn-xs btn-outline"
                        confirm={{
                          title: `Changer le rôle de ${u.name} ?`,
                          description:
                            "Les droits de l'utilisateur changent immédiatement, y compris pour une session déjà ouverte.",
                        }}
                      >
                        <label htmlFor={`role-${u.id}`} className="sr-only">
                          Rôle de {u.name}
                        </label>
                        <select id={`role-${u.id}`} name="role" defaultValue={u.role} className="select select-sm w-36">
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </ActionForm>
                    )}
                  </td>
                  <td>
                    {isSelf ? (
                      <span className="badge badge-success badge-soft">Actif</span>
                    ) : (
                      <ActionForm
                        action={toggleUserActiveAction}
                        fields={{ userId: u.id, activate: String(!u.is_active) }}
                        submitLabel={u.is_active ? "Désactiver" : "Réactiver"}
                        submitClassName={`btn btn-xs ${u.is_active ? "btn-error btn-outline" : "btn-success btn-outline"}`}
                        showSuccess={false}
                        confirm={
                          u.is_active
                            ? {
                                title: `Désactiver le compte de ${u.name} ?`,
                                description:
                                  "L'utilisateur sera déconnecté et ne pourra plus se connecter. Ses produits disparaîtront du catalogue.",
                                confirmLabel: "Désactiver",
                                danger: true,
                              }
                            : undefined
                        }
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
