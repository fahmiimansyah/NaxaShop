import db from '../lib/db';
import GameSearch from '../components/Teang';
import RecentOrders from '../components/RecentOrders';
import { ensureGameCategoryColumns } from '../lib/game-categories';

export default async function Beranda() {
  await ensureGameCategoryColumns(db);

  const [games] = await db.query(
    `SELECT
       id,
       slug,
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
    <main className="relative min-h-screen bg-[#061426] px-4 pb-10 pt-3 text-white sm:pt-5">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(30,64,175,0.14),transparent_34%)]" />

      <div className="relative z-10">
        <GameSearch games={games} />

        <section className="mx-auto mt-10 max-w-7xl">
          <RecentOrders />
        </section>
      </div>
    </main>
  );
}