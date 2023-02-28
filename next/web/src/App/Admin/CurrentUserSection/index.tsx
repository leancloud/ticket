import { useUser } from '@/api/user';

export function CurrentUserSection() {
  const { data, isLoading } = useUser('me', {
    staleTime: Infinity,
  });

  return (
    <section className="w-10 h-10 flex justify-center items-center">
      {isLoading && 'Loading...'}
      {data && (
        <a href="/settings/profile" className="w-8 h-8">
          <img className="w-8 h-8 rounded-md border border-gray-300" src={data.avatarUrl} />
        </a>
      )}
    </section>
  );
}
