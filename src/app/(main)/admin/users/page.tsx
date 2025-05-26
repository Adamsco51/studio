
"use client";

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAllUserProfiles } from '@/lib/mock-data';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Users, UserCheck, ShieldCheck, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
// Import dialog components for potential future role editing
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogClose,
// } from "@/components/ui/dialog";
// import { Label } from '@/components/ui/label';
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function AdminUsersPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  // const [newRole, setNewRole] = useState<'admin' | 'employee' | undefined>(undefined);
  // const [isUpdatingRole, setIsUpdatingRole] = useState(false);


  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard'); 
    }
  }, [authLoading, isAdmin, router]);

  const fetchUsers = async () => {
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
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]); // Removed toast to prevent potential loop

  // Role editing functionality can be added here in the future
  // const handleOpenEditRoleDialog = (userToEdit: UserProfile) => {
  //   setEditingUser(userToEdit);
  //   setNewRole(userToEdit.role);
  // };

  // const handleUpdateUserRole = async () => {
  //   if (!editingUser || !newRole) return;
  //   setIsUpdatingRole(true);
  //   try {
  //     await updateUserProfileInFirestore(editingUser.uid, { role: newRole });
  //     toast({ title: "Rôle Mis à Jour", description: `Le rôle de ${editingUser.displayName} est maintenant ${newRole}.` });
  //     fetchUsers(); // Refresh the list
  //     setEditingUser(null);
  //   } catch (error) {
  //     console.error("Failed to update user role:", error);
  //     toast({ title: "Erreur", description: "Impossible de mettre à jour le rôle.", variant: "destructive" });
  //   } finally {
  //     setIsUpdatingRole(false);
  //   }
  // };

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom d'Affichage</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Date de Création</TableHead>
                  <TableHead>UID</TableHead>
                  {/* <TableHead className="text-right">Actions</TableHead> */}
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
                    <TableCell>{format(new Date(profile.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{profile.uid}</TableCell>
                    {/* <TableCell className="text-right">
                       <Button variant="outline" size="sm" onClick={() => handleOpenEditRoleDialog(profile)} disabled>
                         <Edit className="mr-1 h-4 w-4" /> Modifier Rôle
                       </Button>
                    </TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog for editing user role - Future Enhancement
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le Rôle de {editingUser.displayName}</DialogTitle>
              <DialogDescription>
                Sélectionnez le nouveau rôle pour cet utilisateur.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="userRole">Nouveau Rôle</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as 'admin' | 'employee')}>
                <SelectTrigger id="userRole">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employé</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" disabled={isUpdatingRole}>Annuler</Button></DialogClose>
              <Button onClick={handleUpdateUserRole} disabled={isUpdatingRole || !newRole || newRole === editingUser.role}>
                {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mettre à Jour le Rôle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      */}
    </>
  );
}
