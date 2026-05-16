/**
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PetHack {
  id: string;
  title: string;
  description: string;
  tag: string;
}

export const PET_HACKS: PetHack[] = [
  {
    id: '1',
    tag: 'Perawatan',
    title: 'Kilau Minyak Kelapa',
    description: 'Tambahkan sedikit minyak kelapa organik ke makanan peliharaanmu. Ini membantu menjaga bulu tetap berkilau dan mendukung kesehatan kulit secara alami!'
  },
  {
    id: '2',
    tag: 'Hidrasi',
    title: 'Es Kaldu Segar',
    description: 'Bekukan kaldu ayam rendah natrium dalam cetakan es batu. Camilan dingin ini menjaga anjing tetap terhidrasi dan sejuk di siang hari yang panas.'
  },
  {
    id: '3',
    tag: 'Perilaku',
    title: 'Trik Makan Pelan',
    description: 'Jika peliharaanmu makan terlalu cepat, letakkan mangkuk kecil terbalik di dalam piring utama mereka. Ini memaksa mereka untuk makan lebih perlahan.'
  },
  {
    id: '4',
    tag: 'Kebersihan',
    title: 'Trik Pembersih Kaca',
    description: 'Kesulitan membersihkan bulu di karpet? Gunakan pembersih kaca (squeegee)! Ujung karetnya mengangkat bulu yang tertanam dalam yang sering terlewat oleh penyedot debu.'
  },
  {
    id: '5',
    tag: 'Keamanan',
    title: 'Visibilitas Malam DIY',
    description: 'Tambahkan strip reflektif kecil atau lampu LED klip pada harnes peliharaanmu untuk jalan-jalan malam. Ini membuat mereka lebih mudah terlihat oleh kendaraan.'
  },
  {
    id: '6',
    tag: 'Kesehatan',
    title: 'Matras Penciuman',
    description: 'Sembunyikan camilan kering di dalam handuk terlipat atau matras penciuman. Ini melatih indra penciuman mereka dan memberikan stimulasi mental yang intens.'
  }
];
