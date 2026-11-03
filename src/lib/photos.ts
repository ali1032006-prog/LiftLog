import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { t } from '@/i18n';
import { supabase } from './supabase';

export type PhotoBucket = 'avatars' | 'workout-photos' | 'exercise-photos';

export type PickedImage = { uri: string; width: number };

/** Opens the photo library. Returns null if the user cancels or denies access. */
export async function pickImage({ square = false }: { square?: boolean } = {}): Promise<PickedImage | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error(t('Allow photo access in your phone settings to add pictures.'));
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width };
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Shrinks to at most `maxWidth` pixels wide and re-encodes as JPEG so uploads stay small. */
async function toJpegBytes(image: PickedImage, maxWidth: number): Promise<Uint8Array> {
  const ctx = ImageManipulator.manipulate(image.uri);
  if (image.width > maxWidth) ctx.resize({ width: maxWidth });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.75, format: SaveFormat.JPEG, base64: true });
  if (!saved.base64) throw new Error(t('Could not read the image.'));
  return base64ToBytes(saved.base64);
}

/** Uploads into `<bucket>/<user id>/...` and returns the storage path. */
export async function uploadPhoto(bucket: PhotoBucket, userId: string, image: PickedImage, maxWidth: number): Promise<string> {
  const bytes = await toJpegBytes(image, maxWidth);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export function photoUrl(bucket: PhotoBucket, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Path inside the bucket from a public URL we generated (used to delete an old avatar). */
export function pathFromPublicUrl(bucket: PhotoBucket, url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

export async function removePhotos(bucket: PhotoBucket, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(bucket).remove(paths);
}
