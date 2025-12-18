import { Header } from '@/components/layout/Header';
import { getUser } from '@/app/actions/auth';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
