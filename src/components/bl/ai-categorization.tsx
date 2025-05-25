"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2 } from "lucide-react";
import { categorizeBillOfLading } from "@/ai/flows/categorize-bill-of-lading";
import type { CategorizeBillOfLadingOutput } from "@/ai/flows/categorize-bill-of-lading";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AICategorizationProps {
  initialDescription?: string;
  onCategoriesSuggested?: (categories: string[], subCategories: string[]) => void;
}

export function AICategorization({ initialDescription = "", onCategoriesSuggested }: AICategorizationProps) {
  const [description, setDescription] = useState(initialDescription);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CategorizeBillOfLadingOutput | null>(null);
  const { toast } = useToast();

  const handleSuggestCategories = async () => {
    if (!description.trim()) {
      toast({
        title: "Description manquante",
        description: "Veuillez entrer une description pour le BL.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setSuggestions(null);
    try {
      const result = await categorizeBillOfLading({ description });
      setSuggestions(result);
      if (onCategoriesSuggested) {
        onCategoriesSuggested(result.categories, result.subCategories);
      }
      toast({
        title: "Suggestions générées",
        description: "Les catégories et sous-catégories ont été suggérées par l'IA.",
      });
    } catch (error) {
      console.error("Error fetching AI categories:", error);
      toast({
        title: "Erreur de l'IA",
        description: "Impossible de générer les suggestions pour le moment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-secondary/50 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Suggestions IA pour Catégorisation
        </CardTitle>
        <CardDescription>
          Entrez la description du BL pour obtenir des suggestions de catégories et sous-catégories via l'IA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="bl-description-ai">Description du BL</Label>
          <Textarea
            id="bl-description-ai"
            placeholder="Ex: Électronique et pièces détachées d'ordinateur de Shanghai à New York."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="bg-background"
          />
        </div>
        <Button onClick={handleSuggestCategories} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Suggérer des Catégories
        </Button>

        {suggestions && (
          <div className="mt-4 space-y-3 p-4 bg-background rounded-md border">
            <div>
              <h4 className="font-semibold text-sm">Catégories Suggérées:</h4>
              {suggestions.categories.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {suggestions.categories.map((cat, index) => (
                    <Badge key={`cat-${index}`} variant="secondary">{cat}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune catégorie principale suggérée.</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm">Sous-catégories Suggérées:</h4>
              {suggestions.subCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {suggestions.subCategories.map((subcat, index) => (
                    <Badge key={`subcat-${index}`} variant="outline">{subcat}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune sous-catégorie suggérée.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
