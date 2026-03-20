/**
 * Dados iniciais (JSON) — usados na primeira execução ou após reset
 */
window.HIGHWAY_SEED = {
  veiculos: [
    { id: "v001", placa: "ABC1D23", marca: "BYD", modelo: "Dolphin", ano: 2024, cor: "Branco", categoria: "compacto", tipo: "elétrico", autonomiaKm: 427, quilometragem: 12500, valorAquisicao: 149990, dataAquisicao: "2024-01-15", status: "disponivel" },
    { id: "v002", placa: "XYZ9E87", marca: "BYD", modelo: "Yuan Plus", ano: 2024, cor: "Prata", categoria: "suv_compacto", tipo: "elétrico", autonomiaKm: 420, quilometragem: 8500, valorAquisicao: 229990, dataAquisicao: "2024-02-20", status: "em_locacao" },
    { id: "v003", placa: "DEF4G56", marca: "JAC", modelo: "E-J7", ano: 2024, cor: "Preto", categoria: "sedan", tipo: "elétrico", autonomiaKm: 450, quilometragem: 3200, valorAquisicao: 189990, dataAquisicao: "2024-03-01", status: "manutencao" }
  ],
  clientes: [
    { id: "c001", tipo: "pf", nome: "João Silva Santos", cpf: "123.456.789-00", email: "joao.silva@email.com", telefone: "(11) 98765-4321", scoreCredito: 750, limiteCredito: 5000, status: "ativo", endereco: { cidade: "São Paulo", uf: "SP" } },
    { id: "c002", tipo: "pj", nome: "Maria Oliveira", razaoSocial: "Transportes Rápidos LTDA", cnpj: "12.345.678/0001-90", email: "contato@transportesrapidos.com.br", telefone: "(11) 3456-7890", scoreCredito: 820, limiteCredito: 50000, status: "ativo", endereco: { cidade: "São Paulo", uf: "SP" } }
  ],
  motoristas: [
    { id: "m001", clienteId: "c001", nome: "João Silva Santos", cpf: "123.456.789-00", cnh: "12345678901", cnhCategoria: "B", cnhValidade: "2028-05-20", telefone: "(11) 98765-4321", email: "joao.silva@email.com", status: "ativo", totalViagens: 1250, totalAcidentes: 0, indiceAcidentes: 0, avaliacaoMedia: 4.8 },
    { id: "m002", clienteId: "c002", nome: "Carlos Eduardo Lima", cpf: "987.654.321-00", cnh: "98765432109", cnhCategoria: "B", cnhValidade: "2027-12-15", telefone: "(11) 99876-5432", email: "carlos.lima@email.com", status: "ativo", totalViagens: 890, totalAcidentes: 1, indiceAcidentes: 0.00112, avaliacaoMedia: 4.5 }
  ],
  contratos: [
    { id: "C001", numero: "2024/001", clienteId: "c001", motoristaId: "m001", veiculoId: "v002", tipoContrato: "mensal", plano: "km_livre", dataInicio: "2024-03-01", dataFim: "2024-03-31", valorDiario: 89.9, valorMensal: 2499, kmInicial: 8500, status: "ativo", formaPagamento: "boleto", diaVencimento: 10 }
  ],
  manutencoes: [
    { id: "man001", veiculoId: "v003", tipo: "preventiva", descricao: "Revisão 10.000 km", dataAgendada: "2024-03-15", dataRealizada: null, quilometragem: 10000, custoEstimado: 450, custoReal: null, status: "agendada" }
  ],
  acidentes: [
    { id: "acc001", veiculoId: "v002", motoristaId: "m002", contratoId: "C001", dataOcorrencia: "2024-02-15", hora: "14:30", local: "Av. Paulista", descricao: "Colisão traseira leve", gravidade: "leve", culpado: "terceiro", custoEstimado: 2500, valorSeguro: 2500, status: "resolvido" }
  ],
  pagamentos: [
    { id: "pag001", contratoId: "C001", tipo: "mensalidade", valor: 2499, dataVencimento: "2024-03-10", dataPagamento: "2024-03-09", formaPagamento: "pix", status: "pago", multa: 0, juros: 0 }
  ]
};
