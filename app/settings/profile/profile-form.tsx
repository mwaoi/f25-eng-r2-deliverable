"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent, type MouseEvent } from "react";

// Local profile shape to decouple from DB types during deploy
interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  biography: string | null;
}

const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, { message: "Username must be at least 2 characters." })
    .max(30, { message: "Username must not be longer than 30 characters." })
    .transform((val) => val.trim()),
  bio: z
    .string()
    .max(160, { message: "Biography cannot be longer than 160 characters." })
    .nullable()
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  // ✅ single defaults object; username is forced to string
  const formDefaultValues: ProfileFormValues = {
    username: profile.display_name ?? "",
    bio: profile.biography ?? null,
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: formDefaultValues,
    mode: "onChange", // or "onSubmit" if you don't want instant validation
  });

  const onSubmit = async (data: ProfileFormValues) => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({ biography: data.bio, display_name: data.username })
      .eq("id", profile.id);

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsEditing(false);
    form.reset(data); // reset to normalized values
    router.refresh();

    return toast({ title: "Profile updated successfully!" });
  };

  const startEditing = (e: MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleCancel = (e: MouseEvent) => {
    e.preventDefault();
    form.reset(formDefaultValues); // ✅ use the same defaults
    setIsEditing(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input readOnly={!isEditing} placeholder="Username" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name. It can be your real name or a pseudonym.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input readOnly placeholder={profile.email ?? ""} />
          </FormControl>
          <FormDescription>This is your verified email address.</FormDescription>
          <FormMessage />
        </FormItem>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => {
            const { value, ...rest } = field;
            return (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    readOnly={!isEditing}
                    value={value ?? ""} // inputs can't receive null
                    placeholder="Tell us a little bit about yourself"
                    className="resize-none"
                    {...rest}
                  />
                </FormControl>
                <FormDescription>A short description of yourself!</FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {isEditing ? (
          <>
            <Button type="submit" className="mr-2">
              Update profile
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={startEditing}>Edit Profile</Button>
        )}
      </form>
    </Form>
  );
}
