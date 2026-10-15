Vamos trocar a identidade visual do Rende pela nova (território "Porções"). A antiga era o território "Ponto": tinta azul-preta #2A2C3A, ponto âmbar #D89B3C, fonte Archivo, símbolo com régua e ponto. A nova está na pasta `rende-marca/`, na raiz do repositório:

- `rende-marca/tokens.css`: custom properties novas, com os mesmos nomes das antigas (--brand-_, --accent-_, --canvas, --ink, --positive etc.) e duas novas: --on-accent, --cut-angle e --cut-width.
- `rende-marca/DESIGN.md`: regras de uso. É a fonte de verdade.
- `rende-marca/MARCA.md`: manual de marca (seções 2.1 a 2.4).
- `rende-marca/logo/`: logotipos, símbolo e ícones de app, em SVG e PNG, todos em curvas.

Antes de mexer, leia DESIGN.md e MARCA.md inteiros e faça um levantamento: onde estão definidos os tokens (globals.css / @theme do Tailwind / tailwind.config), onde aparecem o logotipo e o símbolo, o manifest do PWA, os favicons, os metadados de Open Graph, e todo hex, nome de fonte ou componente ligado à marca antiga. Me mostre a lista e o plano antes de alterar arquivos.

Depois, nesta ordem:

1. **Tokens.** Substitua os valores antigos pelos de `rende-marca/tokens.css`, nos dois temas (claro e escuro, via prefers-color-scheme e [data-theme]). Mantenha os nomes de variável que o código já usa. Se o Tailwind mapeia esses tokens, atualize o mapeamento.
2. **Fontes.** Troque Archivo por Familjen Grotesk (peso 700) em todo lugar que usava a display. A Figtree continua na interface. Use next/font ou o carregamento que o projeto já usa, e remova a Archivo.
3. **Logo e ícones.** Copie `rende-marca/logo/` para a pasta de assets públicos e troque todas as referências. Atualize o manifest do PWA com os ícones 512/192 e o maskable 512 com `"purpose": "maskable"`, o apple-touch-icon (180), o favicon (48) e theme_color/background_color (#1C3891 / #F8F5F0).
4. **Componentes.** Aplique as regras que mudaram em DESIGN.md:
   - Botão primário: agora é cobalto (--brand-700) com --on-brand. Não é mais âmbar.
   - Anel de foco: 2px em --brand-500 com 2px de deslocamento.
   - Navegação inferior: o item ativo fica em --brand-700.
   - Barra lateral: o item ativo ganha uma faixa de 3px em --on-brand.
   - Raios: 8px em botão e campo, 10px em cartão.
   - O "ponto âmbar" deixa de existir. Onde ele marcava o número que decide, use a porção rosa (--accent-500 com --on-accent), e só para o valor "sobram R$ X pra você". Rosa nunca em botão, nunca em texto de prejuízo.
   - Faixa de composição: o preço praticado em segmentos proporcionais (materiais · embalagem · sua hora · gás e energia · fixos · maquininha · sobra), separados por cortes de 3px a 8°, com a sobra em rosa. Implementação sugerida em DESIGN.md, seção Signature.
   - Abertura do app: fundo --brand-700, a assadeira em papel, os três cortes abrindo da esquerda para a direita (60ms cada) e a última porção virando rosa. Com prefers-reduced-motion, o símbolo aparece pronto.
   - Semântico informativo: agora é petróleo, não azul.
5. **Limpeza.** Procure e remova resíduos da marca antiga: hex #2A2C3A, #D89B3C, #1C1E28, #15171F, "Archivo", "accent-500" usado como botão, componentes ou SVGs do ponto e da régua. Me liste qualquer ocorrência que você não tiver certeza se deve trocar.
6. **Verificação.** Rode o build, o lint e os testes. Abra as telas principais (Hoje, Materiais, Produtos, Pedidos, Caixa, login e abertura) nos temas claro e escuro, e confira o contraste mínimo de 4.5:1 em texto. Me entregue um resumo do que mudou, arquivo por arquivo.

Regras: não mude nome de token, rota, texto de interface nem lógica de negócio. Isto é só troca de identidade. Faça commits pequenos, um por etapa.
