# CosmoMedic

**Monitoramento da saúde de astronautas durante missões espaciais** · NASA Space Apps Challenge 2026

CosmoMedic é um protótipo mobile-first para apoiar a rotina de saúde da tripulação em órbita. O app reúne check-ins diários, sinais do corpo, exposição à radiação, sono, refeições, exercício, bem-estar emocional e comunicação com a equipe em solo — com Orbi, um companheiro digital para reflexão e orientação de rotina.

> Protótipo de hackathon: os nomes, perfis, leituras de dispositivos e valores exibidos são dados demonstrativos. O app não substitui atendimento médico nem protocolos da missão.

## O que está implementado

- Home com progresso dos registros diários, lembrete do Orbi e status pessoal.
- Status individual com sinais de saúde e comparação ilustrativa com a linha de base pré-voo.
- Orbi com modos **Journal** e **Private**, mensagens rápidas e respostas de demonstração.
- Mensagens simuladas com Mission Control e calendário da missão.
- Avatar, itens cosméticos, moedas e leaderboard entre tripulantes.
- Registros de humor, sono, dosímetro, medidas e lesões, refeições, exercício e relaxamento guiado.
- Navegação por voz: fale **“próxima opção”**, **“anterior”**, **“abrir”** ou o nome de uma tela. O botão também oferece avanço opção por opção com leitura em voz alta.
- Interface em tema escuro Nebula Glass, com menu lateral no desktop e navegação inferior mais menu completo no celular, adaptada para Android, iOS e Web.

Os fluxos seguem as seções 1–5 do documento [CosmoMedic-screens.pdf](docs/CosmoMedic-screens.pdf). O dashboard para a equipe em solo (seção 6) não faz parte desta implementação.

## Telas de referência

As imagens abaixo são as referências visuais entregues para o desafio.

| Fluxo | Referências |
| --- | --- |
| Home e status | [Home](docs/screenshots/AppHome.png) · [Status](docs/screenshots/AppStatus.png) |
| Assistente e comunicação | [Orbi](docs/screenshots/AppOrbi.png) · [Mensagens](docs/screenshots/AppMessages.png) · [Calendário](docs/screenshots/AppCalendar.png) |
| Perfil e comunidade | [Avatar](docs/screenshots/AppAvatar.png) · [Leaderboard](docs/screenshots/AppLeaderboard.png) |
| Check-ins | [Humor](docs/screenshots/AppMood.png) · [Sono](docs/screenshots/AppSleep.png) · [Radiação](docs/screenshots/AppRadiation.png) |
| Saúde e rotina | [Corpo](docs/screenshots/AppBody.png) · [Refeições](docs/screenshots/AppMeals.png) · [Exercício](docs/screenshots/AppExercise.png) · [Relaxamento](docs/screenshots/AppRelax.png) |

## Requisitos

- Node.js **22.13 ou mais recente**, conforme a versão do Expo SDK 58.
- npm (o repositório inclui `package-lock.json`).
- Para Android/iOS: emulador ou dispositivo e ferramentas de build compatíveis com Expo.
- Para reconhecimento de voz nativo: build de desenvolvimento; o módulo de voz não está incluído no Expo Go.

## Instalar e executar

```bash
npm ci
npx expo start
```

No terminal do Expo, pressione `w` para abrir a versão Web ou `a` para Android. Para rodar o app com o reconhecimento de voz em um emulador/dispositivo Android ou iOS, gere uma build de desenvolvimento:

```bash
npx expo run:android
# ou, no macOS com Xcode:
npx expo run:ios
```

O projeto usa Continuous Native Generation. `ios/` e `android/` são gerados pelo Expo e não devem ser editados manualmente.

## Verificações

```bash
npm run lint
npm run typecheck
```

## Estrutura

```text
src/
  app/               Rotas Expo Router e telas
    log/[module].tsx Registros de saúde
  components/        Componentes compartilhados e navegação por voz
  constants/         Tema Nebula Glass e dados de navegação
docs/
  CosmoMedic-screens.pdf
  screenshots/       Referências visuais do desafio
```

## Privacidade e limites do protótipo

As conversas e os registros desta versão são exemplos locais de interface; não existe integração com sensores, backend clínico ou sistema real da NASA. O modo **Private** do Orbi é apenas uma demonstração visual de fluxo e não deve ser usado para inserir informações pessoais reais.
