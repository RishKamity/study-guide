/* extras.js — DEMO walk-in sheet, twins (look-alike concepts) and true/false traps. All optional. */
A.SHEET = {
  FORMULAS: [['Equilibrium', 'Set Qd = Qs, solve for P, plug P into either curve for Q'], ['Total cost', 'TC = FC + VC; FC = TC at zero output'], ['Average total cost', 'ATC = TC ÷ Q'], ['Average variable cost', 'AVC = VC ÷ Q'], ['Marginal cost', 'MC = change in TC from one more unit'], ['Profit max', 'Produce where MR = MC']],
  JES: [],
  TRAPS: ['Own price moves along the curve; everything else shifts it.', 'Substitutes move together; complements move opposite.', 'Demand shifts move P and Q the same way; supply shifts move them opposite.', 'When both curves shift, one of P or Q is uncertain.', 'Marginal subtracts; average divides.', 'Shut down when P < AVC, not when P < ATC.']
};
A.TWINS = [
  { id: 'dem-vs-qd', title: 'Change in demand vs. change in quantity demanded', diff: 'A shift of the curve vs. a move along it.',
    L: { name: 'Change in demand', pts: ['The whole curve shifts', 'Caused by income, related prices, tastes, expectations, buyers', 'At every price, buyers want more (or less)'] },
    R: { name: 'Change in quantity demanded', pts: ['A movement along one curve', 'Caused only by the good’s own price', 'Same curve, different point'] },
    q: [['The price of the good itself falls.', 'R'], ['Buyers’ incomes rise.', 'L'], ['A substitute becomes cheaper.', 'L'], ['Sellers run a sale on the good.', 'R']] },
  { id: 'comp-vs-mono', title: 'Perfect competition vs. monopoly', diff: 'Price taker vs. price maker.',
    L: { name: 'Perfect competition', pts: ['P = MR = MC', 'Many firms, free entry', 'Zero long-run profit'] },
    R: { name: 'Monopoly', pts: ['P > MR = MC', 'One firm, barriers to entry', 'Less output, deadweight loss'] },
    q: [['The firm’s demand curve is horizontal.', 'L'], ['Marginal revenue is below price.', 'R'], ['Entry drives economic profit to zero.', 'L'], ['A patent keeps rivals out.', 'R']] }
];
A.TF = [
  ['A fall in the good’s own price shifts its demand curve to the right.', false, 'It moves along the curve.', '1A'],
  ['If two goods are complements, a higher price of one lowers demand for the other.', true, 'That is the definition of complements.', '1A'],
  ['Better technology shifts supply to the right.', true, 'Lower costs raise supply.', '1A'],
  ['A binding price ceiling causes a surplus.', false, 'A binding ceiling causes a shortage.', '1B'],
  ['A supply increase lowers price and raises quantity.', true, 'Supply shifts move P and Q in opposite directions.', '1B'],
  ['Fixed cost is zero when output is zero.', false, 'Fixed cost is paid even at zero output.', '2A'],
  ['MC crosses ATC at the minimum of ATC.', true, 'That is why ATC is U-shaped around it.', '2A'],
  ['Average fixed cost rises as output rises.', false, 'It always falls.', '2A'],
  ['For a perfectly competitive firm, price equals marginal revenue.', true, 'A price taker gets the market price for every unit.', '2B'],
  ['A monopolist sets price equal to marginal cost.', false, 'It sets MR = MC and charges a price above MC.', '2B']
].map(function (r, i) { return { id: 'tf' + (i + 1), t: r[0], a: r[1], why: r[2], topic: r[3] }; });
