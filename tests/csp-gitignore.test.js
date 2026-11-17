'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const paginas = ['index.html', 'catalogo.html', 'producto.html', 'login.html', 'registro.html', 'cliente.html', 'empleado.html', 'admin.html', 'admin-clientes.html', 'admin-compras.html', 'admin-empleados.html', 'admin-inventario.html', 'admin-productos.html', 'admin-ventas.html'];
const meta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://open.er-api.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'">`;

test('las 14 páginas incluyen la política exacta en head', () => {
  assert.deepEqual(fs.readdirSync(raiz).filter((nombre) => nombre.endsWith('.html')).sort(), [...paginas].sort());
  for (const pagina of paginas) {
    const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');
    const cabeza = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
    assert.ok(cabeza, pagina);
    assert.equal(cabeza[1].split(meta).length - 1, 1, pagina);
    assert.doesNotMatch(cabeza[1], /frame-ancestors/i, pagina);
    assert.doesNotMatch(html, /\son[a-z]+\s*=|javascript\s*:/i, pagina);
    for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      assert.match(script[1], /\bsrc\s*=/i, pagina);
      assert.equal(script[2].trim(), '', pagina);
    }
  }
});

test('.gitignore contiene solo las siete reglas solicitadas', () => {
  const reglas = fs.readFileSync(path.join(raiz, '.gitignore'), 'utf8').trim().split(/\r?\n/);
  assert.deepEqual(reglas, ['node_modules/', '.DS_Store', 'Thumbs.db', 'desktop.ini', '*.log', '.vscode/', 'evidencias/*.tmp']);
});
