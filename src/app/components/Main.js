import db from "../lib/db";
import GameSearch from "../components/Teang";
import RequestGameBox from "../components/RequestGameBox";
import RecentOrders from "../components/RecentOrders";
export default async function Beranda() {
const [games] = await db.query(
  `SELECT id, nama, publisher, gambar, zone_id, server_game, kode_game, status_game, badge_label, badge_tipe
   FROM games
   WHERE status_game = 'aktif'
   ORDER BY id ASC`
);

  return (
    <main className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <GameSearch games={games} />
      <RecentOrders />  
      <RequestGameBox />
    </main>
  );
}