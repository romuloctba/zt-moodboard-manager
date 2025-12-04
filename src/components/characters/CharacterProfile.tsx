'use client';

import { useState, useCallback } from 'react';
import { 
  User, 
  Sparkles, 
  BookOpen, 
  Palette,
  Plus,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { characterRepository } from '@/lib/db/repositories';
import type { Character, CharacterProfile as CharacterProfileType, CharacterMetadata } from '@/types';

interface CharacterProfileProps {
  character: Character;
  onUpdate: (character: Character) => void;
}

export function CharacterProfile({ character, onUpdate }: CharacterProfileProps) {
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description || '');
  const [age, setAge] = useState(character.profile?.age || '');
  const [role, setRole] = useState(character.profile?.role || '');
  const [backstory, setBackstory] = useState(character.profile?.backstory || '');
  const [personality, setPersonality] = useState<string[]>(character.profile?.personality || []);
  const [abilities, setAbilities] = useState<string[]>(character.profile?.abilities || []);
  const [archetype, setArchetype] = useState(character.metadata?.archetype || '');
  const [inspirations, setInspirations] = useState<string[]>(character.metadata?.inspirations || []);
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    character.profile?.customFields || {}
  );
  
  // Input states for adding new items
  const [newPersonality, setNewPersonality] = useState('');
  const [newAbility, setNewAbility] = useState('');
  const [newInspiration, setNewInspiration] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const profile: CharacterProfileType = {
        age: age || undefined,
        role: role || undefined,
        backstory: backstory || undefined,
        personality: personality.length > 0 ? personality : undefined,
        abilities: abilities.length > 0 ? abilities : undefined,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      };

      const metadata: CharacterMetadata = {
        ...character.metadata,
        archetype: archetype || undefined,
        inspirations: inspirations.length > 0 ? inspirations : undefined,
      };

      await characterRepository.rename(character.id, name);
      await characterRepository.update(character.id, {
        description: description || undefined,
        profile,
        metadata,
      });

      const updated = await characterRepository.getById(character.id);
      if (updated) {
        onUpdate(updated);
        toast.success('Character saved');
      }
    } catch (error) {
      console.error('Failed to save character:', error);
      toast.error('Failed to save character');
    } finally {
      setSaving(false);
    }
  }, [
    character, name, description, age, role, backstory, 
    personality, abilities, archetype, inspirations, customFields, onUpdate
  ]);

  const addPersonality = () => {
    if (newPersonality.trim() && !personality.includes(newPersonality.trim())) {
      setPersonality([...personality, newPersonality.trim()]);
      setNewPersonality('');
    }
  };

  const removePersonality = (trait: string) => {
    setPersonality(personality.filter(p => p !== trait));
  };

  const addAbility = () => {
    if (newAbility.trim() && !abilities.includes(newAbility.trim())) {
      setAbilities([...abilities, newAbility.trim()]);
      setNewAbility('');
    }
  };

  const removeAbility = (ability: string) => {
    setAbilities(abilities.filter(a => a !== ability));
  };

  const addInspiration = () => {
    if (newInspiration.trim() && !inspirations.includes(newInspiration.trim())) {
      setInspirations([...inspirations, newInspiration.trim()]);
      setNewInspiration('');
    }
  };

  const removeInspiration = (inspiration: string) => {
    setInspirations(inspirations.filter(i => i !== inspiration));
  };

  const addCustomField = () => {
    if (newFieldKey.trim() && newFieldValue.trim()) {
      setCustomFields({
        ...customFields,
        [newFieldKey.trim()]: newFieldValue.trim(),
      });
      setNewFieldKey('');
      setNewFieldValue('');
    }
  };

  const removeCustomField = (key: string) => {
    const updated = { ...customFields };
    delete updated[key];
    setCustomFields(updated);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Character Profile</h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Essential details about your character
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Character name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g., 25, Unknown, Immortal"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role / Occupation</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Protagonist, Villain, Side Character"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief overview of the character..."
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="archetype">Archetype</Label>
              <Input
                id="archetype"
                value={archetype}
                onChange={(e) => setArchetype(e.target.value)}
                placeholder="e.g., The Hero, The Mentor, The Trickster"
              />
            </div>
          </CardContent>
        </Card>

        {/* Personality */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Personality Traits
            </CardTitle>
            <CardDescription>
              Key personality characteristics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {personality.map((trait) => (
                <Badge key={trait} variant="secondary" className="gap-1 pr-1">
                  {trait}
                  <button
                    onClick={() => removePersonality(trait)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {personality.length === 0 && (
                <span className="text-sm text-muted-foreground">No traits added yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPersonality}
                onChange={(e) => setNewPersonality(e.target.value)}
                placeholder="Add a trait..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPersonality())}
              />
              <Button variant="outline" size="icon" onClick={addPersonality}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Abilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Abilities & Skills
            </CardTitle>
            <CardDescription>
              Powers, skills, or special abilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {abilities.map((ability) => (
                <Badge key={ability} variant="outline" className="gap-1 pr-1">
                  {ability}
                  <button
                    onClick={() => removeAbility(ability)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {abilities.length === 0 && (
                <span className="text-sm text-muted-foreground">No abilities added yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAbility}
                onChange={(e) => setNewAbility(e.target.value)}
                placeholder="Add an ability..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAbility())}
              />
              <Button variant="outline" size="icon" onClick={addAbility}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backstory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Backstory
            </CardTitle>
            <CardDescription>
              Character history and background
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              value={backstory}
              onChange={(e) => setBackstory(e.target.value)}
              placeholder="Write the character's backstory, history, and important life events..."
              className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </CardContent>
        </Card>

        {/* Inspirations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Inspirations
            </CardTitle>
            <CardDescription>
              Characters, people, or concepts that inspired this character
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {inspirations.map((inspiration) => (
                <Badge key={inspiration} variant="secondary" className="gap-1 pr-1">
                  {inspiration}
                  <button
                    onClick={() => removeInspiration(inspiration)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {inspirations.length === 0 && (
                <span className="text-sm text-muted-foreground">No inspirations added yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newInspiration}
                onChange={(e) => setNewInspiration(e.target.value)}
                placeholder="Add an inspiration..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInspiration())}
              />
              <Button variant="outline" size="icon" onClick={addInspiration}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Custom Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Custom Fields
            </CardTitle>
            <CardDescription>
              Add your own custom attributes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(customFields).length > 0 && (
              <div className="space-y-3">
                {Object.entries(customFields).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{key}</div>
                      <div className="text-sm text-muted-foreground">{value}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeCustomField(key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Add Custom Field</Label>
              <div className="flex gap-2">
                <Input
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  placeholder="Field name"
                  className="flex-1"
                />
                <Input
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  placeholder="Value"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomField())}
                />
                <Button variant="outline" size="icon" onClick={addCustomField}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Palette (read-only, from metadata) */}
        {character.metadata?.palette && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Palette
              </CardTitle>
              <CardDescription>
                Extracted from reference images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {character.metadata.palette.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-lg border shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
