export const metadata = {
  title: 'NaXaShop - Top Up Game Sat-Set & Terlacak',
  description:
    'Top up game favorit di NaXaShop dengan proses sat-set, pembayaran praktis, dan status pesanan yang bisa dilacak.',
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