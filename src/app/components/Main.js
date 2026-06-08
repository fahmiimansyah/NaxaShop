import db from '../lib/db';
import GameSearch from '../components/Teang';
import RequestGameBox from '../components/RequestGameBox';
import RecentOrders from '../components/RecentOrders';
import { ensureGameCategoryColumns } from '../lib/game-categories';

export default async function Beranda() {
  await ensureGameCategoryColumns(db);

  const [games] = await db.query(
    `SELECT
       id,
       nama,
       publisher,
       gambar,
       zone_id,
       server_game,
       kode_game,
       status_game,
       kategori_game,
       sort_order,
       badge_label,
       badge_tipe
     FROM games
     WHERE status_game IN ('aktif', 'coming_soon')
     ORDER BY
       CASE status_game
         WHEN 'aktif' THEN 1
         WHEN 'coming_soon' THEN 2
         ELSE 3
       END,
       sort_order ASC,
       id ASC`
  );

  return (
    <main className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <GameSearch games={games} />
      <RecentOrders />
      <RequestGameBox />
    </main>
  );
}
