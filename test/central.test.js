const assert = require('assert'); const os = require('os'); const path = require('path'); const fs = require('fs');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'central-'));
const P = require('../pedidos');
const ped = `*✅ PEDIDO CONFIRMADO PELO CLIENTE*
*Pedido Nº FF-MOOCA-261116-GLAUCIA-2W4*
Cliente: Glaucia Sirquera · (11) 99483-8998 · enviado em 16/11/2026 13h26
Quem vai retirar: o próprio cliente
*Loja: Fada Farinha Mooca*
📍 Rua Desembargador Paulo Costa, 138 – Parque da Mooca, São Paulo – SP, CEP 03122-040

Olá, Fada Farinha Mooca! ✨
Quero confirmar este pedido:

• Bolo Ferrero (bolo especial) — massa: de chocolate — 1 kg × R$ 170,00/kg = R$ 170,00

*Total estimado: R$ 170,00*

Para: 17/11/2026 às 14h30
Retirada na loja
Obs.: Teste`;
const orc = ped.replace('*✅ PEDIDO CONFIRMADO PELO CLIENTE*','*🟡 SÓ ORÇAMENTO · ainda não é pedido*').replace('Pedido Nº FF-MOOCA-261116-GLAUCIA-2W4','Orçamento Nº FF-MOOCA-261116-GLAUCIA-94Y');
const mogi = `*Pedido Nº FF-MOGI-261116-CINTHIA-CMT*
Cliente: Cinthia Ezure · (11) 94219-5432 · enviado em 16/11/2026 12h36
Quem vai retirar: o próprio cliente
*Loja: Fada Farinha Mogi das Cruzes*
📍 Rua Dom Antônio Cândido de Alvarenga, 443 – Mogi das Cruzes

Olá, Fada Farinha Mogi das Cruzes! ✨
Gostaria de um orçamento:

• Bolo personalizado — formato: redondo — massa: de chocolate — sabor: Trufado com Morango (massa de chocolate) — 2,5 kg × R$ 170,00/kg = R$ 425,00

*Total estimado: R$ 425,00*

Para: 15/12/2026 às 11h00
Retirada na loja
Obs.: Tema da festa é Margaridas

*Para confirmar o pedido: sinal de 50% via Pix*
Sinal: R$ 212,50 · restante na retirada, conforme o peso final`;
const a = P.lerMensagemCardapio(ped);
assert.equal(a.tipo,'pedido'); assert.equal(a.loja,'Mooca'); assert.equal(a.cliente,'Glaucia Sirquera'); assert.equal(a.telefone_informado,'(11) 99483-8998');
assert.equal(a.total_estimado,170); assert.equal(a.para,'17/11/2026 às 14h30'); assert.equal(a.itens.length,1); assert.equal(a.obs,'Teste');
const b = P.lerMensagemCardapio(orc); assert.equal(b.tipo,'orcamento'); assert.equal(b.numero,'FF-MOOCA-261116-GLAUCIA-94Y');
const c = P.lerMensagemCardapio(mogi); assert.equal(c.tipo,'orcamento'); assert.equal(c.loja,'Mogi das Cruzes'); assert.equal(c.sinal,212.5); assert.equal(c.total_estimado,425);
assert.equal(P.lerMensagemCardapio('oi, bom dia'), null);
// registrar + imagem como comprovante
const r = P.registrarMensagem({ loja_instancia:'Mogi', telefone:'5511942195432', texto: mogi });
assert.equal(r.situacao,'orcamento');
const r2 = P.registrarMensagem({ loja_instancia:'Mogi', telefone:'5511942195432', texto:'', imagem:{url:'https://x/img.jpg'} });
assert.equal(r2.id,'FF-MOGI-261116-CINTHIA-CMT'); assert.equal(r2.comprovante_a_conferir,true);
assert.equal(P.registrarMensagem({ telefone:'5511000', texto:'', imagem:{url:'u'} }), null);
// repetir a mesma mensagem não duplica
P.registrarMensagem({ loja_instancia:'Mogi', telefone:'5511942195432', texto: mogi });
assert.equal(P.listar().length,1);
P.registrarMensagem({ loja_instancia:'Mooca', telefone:'5511994838998', texto: ped });
assert.equal(P.listar({loja:'Mooca'}).length,1); assert.equal(P.listar({situacao:'pedido'}).length,1);
const u = P.atualizar('FF-MOGI-261116-CINTHIA-CMT',{situacao:'comanda_criada', comanda:'CINTHIA 5432-15/12 11HS'});
assert.equal(u.situacao,'comanda_criada');
assert.throws(()=>P.atualizar('FF-MOGI-261116-CINTHIA-CMT',{situacao:'xyz'}));
console.log('ok: todos os testes passaram');
