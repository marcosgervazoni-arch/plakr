import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load env
dotenv.config({ path: '.env' });

const native = `<script async="async" data-cfasync="false" src="https://pl29004907.profitablecpmratenetwork.com/ba812430c3bfa05e40f0bd6f553978c7/invoke.js"></script>
<div id="container-ba812430c3bfa05e40f0bd6f553978c7"></div>`;

const banner_300x250 = `<script>
  atOptions = {
    'key' : '3fcf4d4ebaf1bb65d20fa1468a80cf31',
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
</script>
<script src="https://www.highperformanceformat.com/3fcf4d4ebaf1bb65d20fa1468a80cf31/invoke.js"></script>`;

const banner_160x600 = `<script>
  atOptions = {
    'key' : 'ea4f7748be0a20b5b78ec7c928c6bda3',
    'format' : 'iframe',
    'height' : 600,
    'width' : 160,
    'params' : {}
  };
</script>
<script src="https://www.highperformanceformat.com/ea4f7748be0a20b5b78ec7c928c6bda3/invoke.js"></script>`;

const banner_320x50 = `<script>
  atOptions = {
    'key' : '7974ca0bcb4aeb169af6bf58cce85767',
    'format' : 'iframe',
    'height' : 50,
    'width' : 320,
    'params' : {}
  };
</script>
<script src="https://www.highperformanceformat.com/7974ca0bcb4aeb169af6bf58cce85767/invoke.js"></script>`;

const banner_728x90 = `<script>
  atOptions = {
    'key' : 'ca129f5f63501bb4c5cb90ea60e13ee4',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://www.highperformanceformat.com/ca129f5f63501bb4c5cb90ea60e13ee4/invoke.js"></script>`;

const mapping = {
  top_desktop:     banner_728x90,
  top_mobile:      banner_320x50,
  bottom_desktop:  banner_728x90,
  bottom_mobile:   banner_320x50,
  sidebar:         banner_160x600,   // skyscraper 160x600 — ideal para sidebar
  between_desktop: banner_728x90,
  between_mobile:  banner_320x50,
  popup:           banner_300x250,
  native:          native,
};

const jsonValue = JSON.stringify(mapping);

const conn = await createConnection(process.env.DATABASE_URL);

try {
  const [result] = await conn.execute(
    'UPDATE platform_settings SET adNetworkScripts = ?, adsEnabled = 1 WHERE id = 1',
    [jsonValue]
  );
  console.log('✅ Updated successfully:', result.affectedRows, 'row(s)');
  
  // Verify
  const [rows] = await conn.execute('SELECT adsEnabled, JSON_KEYS(adNetworkScripts) as keys FROM platform_settings WHERE id = 1');
  console.log('✅ Verification:', rows[0]);
} finally {
  await conn.end();
}
