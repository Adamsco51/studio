
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update profile with display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }
      toast({ title: 'Inscription Réussie', description: 'Votre compte a été créé. Redirection vers le tableau de bord...' });
      // TODO: Here you might want to create a user profile document in Firestore
      // with a default role e.g. 'employee'
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erreur d\'inscription.');
      toast({ title: 'Erreur d\'Inscription', description: err.message || 'Veuillez vérifier les informations.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="space-y-1 text-center">
         <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12 text-primary">
                <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.027a.75.75 0 00-.366.648v10.65a.75.75 0 00.366.648l8.256 4.425a.75.75 0 00.756 0l8.256-4.425a.75.75 0 00.366-.648V6.675a.75.75 0 00-.366-.648L12.378 1.602zM12 15.93a.75.75 0 00.622-.355l3.256-4.652a.75.75 0 00-.088-1.038.75.75 0 00-1.038-.088l-2.664 3.806-3.928-3.226a.75.75 0 00-.952.042.75.75 0 00.042.952l4.5 3.75a.75.75 0 00.248.11z" />
            </svg>
        </div>
        <CardTitle className="text-2xl">Créer un Compte</CardTitle>
        <CardDescription>Rejoignez TransitFlow pour gérer vos opérations.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nom complet</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nom@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Création du compte...' : <> <UserPlus className="mr-2 h-4 w-4" /> S'inscrire</>}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-center text-sm">
        <p>Déjà un compte ? <Link href="/login" className="font-medium text-primary hover:underline">Connectez-vous</Link></p>
      </CardFooter>
    </Card>
  );
}
