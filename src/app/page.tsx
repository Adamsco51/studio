import { redirect } from 'next/navigation';
import { Analytics } from "@vercel/analytics/next"import { Analytics } from "@vercel/analytics/next"

export default function HomePage() {
  redirect('/dashboard');
  return null; // Or a loading spinner, but redirect is usually fast
}
