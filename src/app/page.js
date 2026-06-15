export const metadata = {
  title: 'NaXaShop - Top Up Game Praktis & Terlacak',
  description:
    'Top up game favorit kamu di NaXaShop dengan pembayaran mudah, proses otomatis, dan status pesanan yang bisa dipantau sampai selesai.',
  alternates: {
    canonical: '/',
  },
};

import Main from '../app/components/Main'
import SoftLaunchNotice from './components/SoftLaunchNotice'
export default function Home(){
  return (
    <div>
      <SoftLaunchNotice />
    <Main />
    </div>
  )
};