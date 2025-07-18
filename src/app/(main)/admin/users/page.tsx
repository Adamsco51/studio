
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAllUserProfiles, updateUserProfileInFirestore } from '@/lib/mock-data';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Users, UserCheck, ShieldCheck, Edit, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const jobTitleOptions: UserProfile['jobTitle'][] = [
  "Agent Opérationnel",
  "Secrétaire",
  "Comptable",
  "Manager",
  "Autre",
];

export default function AdminUsersPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'employee' | undefined>(undefined);
  const [newJobTitle, setNewJobTitle] = useState<UserProfile['jobTitle']>(undefined);
  const [newDisplayName, setNewDisplayName] = useState<string>('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [authLoading, isAdmin, router]);

  const fetchUsers = useCallback(async () => {
    if (isAdmin) {
      setIsLoading(true);
      try {
        const fetchedUsers = await getAllUserProfiles();
        setUsersList(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch user profiles:", error);
        toast({ title: "Erreur", description: "Impossible de charger la liste des utilisateurs.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  },[isAdmin, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenEditDialog = (userToEdit: UserProfile) => {
    setEditingUser(userToEdit);
    setNewRole(userToEdit.role);
    setNewJobTitle(userToEdit.jobTitle || 'Agent Opérationnel');
    setNewDisplayName(userToEdit.displayName || '');
  };

  const handleUpdateUserInfo = async () => {
    if (!editingUser || !newRole || !newJobTitle || newDisplayName.trim() === '') {
        toast({ title: "Erreur", description: "Veuillez vérifier les informations saisies.", variant: "destructive" });
        return;
    }
    setIsUpdatingUser(true);
    try {
      const updates: Partial<UserProfile> = {};
      if (newDisplayName !== editingUser.displayName) {
        updates.displayName = newDisplayName;
      }
      if (newRole !== editingUser.role) {
        updates.role = newRole;
      }
      if (newJobTitle !== (editingUser.jobTitle || 'Agent Opérationnel')) {
        updates.jobTitle = newJobTitle;
      }


      if (Object.keys(updates).length === 0) {
        toast({ title: "Aucune Modification", description: "Aucune information n'a été modifiée." });
        setEditingUser(null);
        return;
      }

      await updateUserProfileInFirestore(editingUser.uid, updates);
      toast({ title: "Informations Mises à Jour", description: `Les informations de ${editingUser.displayName || editingUser.email} ont été mises à jour.` });
      fetchUsers(); // Refresh the list
      setEditingUser(null); // Close dialog
    } catch (error) {
      console.error("Failed to update user info:", error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour les informations.", variant: "destructive" });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Chargement des utilisateurs...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="text-center py-10"><p className="text-xl">Accès non autorisé.</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Gestion des Utilisateurs"
        description="Consultez et gérez les comptes utilisateurs de l'application."
      />
      <Card>
        <CardHeader>
          <CardTitle>Liste des Utilisateurs Enregistrés</CardTitle>
          <CardDescription>
            {usersList.length > 0
              ? `Total des utilisateurs: ${usersList.length}.`
              : "Aucun utilisateur enregistré pour le moment."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersList.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">Il n'y a aucun utilisateur à afficher.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom d'Affichage</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Date de Création</TableHead>
                    <TableHead>UID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersList.map((profile) => (
                    <TableRow key={profile.uid}>
                      <TableCell className="font-medium">{profile.displayName || 'N/A'}</TableCell>
                      <TableCell>{profile.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={profile.role === 'admin' ? 'destructive' : 'secondary'}>
                          {profile.role === 'admin' ? <ShieldCheck className="mr-1 h-3 w-3" /> : <UserCheck className="mr-1 h-3 w-3" />}
                          {profile.role === 'admin' ? 'Admin' : 'Employé'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                             <Briefcase className="h-3 w-3"/> {profile.jobTitle || 'Non défini'}
                          </Badge>
                      </TableCell>
                      <TableCell>{profile.createdAt ? format(parseISO(profile.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr }) : 'N/A'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{profile.uid}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(profile)} disabled={isUpdatingUser}>
                           <Edit className="mr-1 h-4 w-4" /> Modifier
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier Utilisateur: {editingUser.displayName || editingUser.email || "Utilisateur sélectionné"}</DialogTitle>
              <DialogDescription>
                Modifiez le nom, le rôle et/ou le poste de cet utilisateur.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="userEmail">Email (Non modifiable)</Label>
                <Input id="userEmail" value={editingUser.email || ''} disabled className="mt-1" />
              </div>
              <div>
                <Label htmlFor="userDisplayName">Nom d'Affichage</Label>
                <Input
                  id="userDisplayName"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="mt-1"
                  disabled={isUpdatingUser}
                />
              </div>
              <div>
                <Label htmlFor="userRole">Nouveau Rôle</Label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as 'admin' | 'employee')} disabled={isUpdatingUser}>
                  <SelectTrigger id="userRole" className="mt-1">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employé</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="userJobTitle">Nouveau Poste</Label>
                <Select value={newJobTitle} onValueChange={(value) => setNewJobTitle(value as UserProfile['jobTitle'])} disabled={isUpdatingUser}>
                  <SelectTrigger id="userJobTitle" className="mt-1">
                    <SelectValue placeholder="Sélectionner un poste" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTitleOptions.map(title => (
                        <SelectItem key={title} value={title}>{title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" disabled={isUpdatingUser} onClick={() => setEditingUser(null)}>Annuler</Button></DialogClose>
              <Button
                onClick={handleUpdateUserInfo}
                disabled={
                  isUpdatingUser ||
                  !newRole || !newJobTitle || newDisplayName.trim() === '' ||
                  (newRole === editingUser.role && newJobTitle === (editingUser.jobTitle || 'Agent Opérationnel') && newDisplayName === (editingUser.displayName || ''))
                }
              >
                {isUpdatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
