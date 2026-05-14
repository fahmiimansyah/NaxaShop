import GameSearch from "../components/Teang";

export default async function Beranda() {
  const respon = await fetch(`http://localhost:3000/api/games/`, {
    cache: "no-store",
  });

  const games = await respon.json();

  return (
    <main className="min-h-screen bg-gray-900 text-white px-4 py-8">
      
      <GameSearch games={games} />
    </main>
  );
}