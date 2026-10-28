/* gens.js — DEMO generators. Each A.defGen(topic, skill, label, fn) returns an item built with A.mc.
   Rules: every number is computed here (never typed by hand), every wrong option encodes a real mistake
   and says why, `check` recomputes the answer independently, and `rule` + `work` are always filled. */
(function () {
  var $ = function (v) { return A.fmt(v); }, units = function (v) { return typeof v === 'number' ? A.num(v) + ' units' : v; };
  var GOODS = ['coffee', 'bicycles', 'concert tickets', 'textbooks', 'avocados', 'phone chargers'];
  function sign(c) { return c < 0 ? '− ' + Math.abs(c) : '+ ' + c; }
  function market(rng) {
    var P = rng.int(4, 20), Q = rng.step(20, 120, 5), b = rng.int(1, 5), d = rng.int(1, 5);
    return { P: P, Q: Q, b: b, d: d, a: Q + b * P, c: Q - d * P, good: rng.pick(GOODS) };
  }
  function curves(m) { return 'Demand: Qd = ' + m.a + ' − ' + m.b + 'P. Supply: Qs = ' + (m.c < 0 ? '−' + Math.abs(m.c) : m.c) + ' + ' + m.d + 'P.'; }

  /* ---------- 1B equilibrium price ---------- */
  A.defGen('1B', 'eqp', 'Equilibrium price from demand and supply equations', function (rng) {
    var m = market(rng), wrong = [[A.round2(m.a / m.b), 'That is the price where quantity demanded falls to zero, not where Qd = Qs.'], [m.P + 2, 'Set Qd equal to Qs and solve for P; recheck the algebra.'], [m.P - 2, 'Set Qd equal to Qs and solve for P; recheck the algebra.']];
    if (m.c !== 0) wrong.push([A.round2(Math.abs((m.a + m.c) / (m.b + m.d))), 'A sign slipped: move the supply intercept to the other side with the opposite sign.']);
    return A.mc({ rng: rng, topic: '1B', skill: 'eqp', stem: 'In the market for ' + m.good + ': ' + curves(m) + ' What is the equilibrium price?', correct: m.P, wrong: wrong,
      rule: 'At equilibrium, quantity demanded equals quantity supplied: set Qd = Qs and solve for P.', work: m.a + ' − ' + m.b + 'P = ' + m.c + ' + ' + m.d + 'P → ' + (m.a - m.c) + ' = ' + (m.b + m.d) + 'P → P = ' + m.P + '.',
      calc: true, diff: 2, check: function () { return (m.a - m.c) / (m.b + m.d); } });
  });
  /* ---------- 1B equilibrium quantity ---------- */
  A.defGen('1B', 'eqq', 'Equilibrium quantity from demand and supply equations', function (rng) {
    var m = market(rng);
    return A.mc({ rng: rng, topic: '1B', skill: 'eqq', fmt: units, stem: 'In the market for ' + m.good + ': ' + curves(m) + ' What is the equilibrium quantity?', correct: m.Q,
      wrong: [[m.a, 'That is the quantity demanded at a price of zero.'], [m.Q + m.b * 2, 'Plug the equilibrium price into one curve; this used the wrong price.'], [m.Q + m.d * 3, 'Plug the equilibrium price into one curve; this used the wrong price.'], [m.P, 'That is the equilibrium price, not the quantity.']],
      rule: 'Find P where Qd = Qs, then plug that P into either curve to get Q.', work: 'P = ' + m.P + '. Qd = ' + m.a + ' − ' + m.b + '×' + m.P + ' = ' + m.Q + '.', calc: true, diff: 2,
      check: function () { var P = (m.a - m.c) / (m.b + m.d); return m.a - m.b * P; } });
  });
  /* ---------- 1B what happens to price and quantity ---------- */
  var EV = [
    ['Consumers’ incomes rise, and the good is a normal good.', 'D+'], ['The price of a close substitute rises.', 'D+'], ['A popular study says the good is healthier than people thought.', 'D+'],
    ['The price of a complement rises sharply.', 'D-'], ['Consumers’ incomes fall, and the good is a normal good.', 'D-'], ['Buyers expect the price to fall next month.', 'D-'],
    ['A new machine lowers the cost of producing the good.', 'S+'], ['Many new firms enter the market.', 'S+'], ['The government gives producers a per-unit subsidy.', 'S+'],
    ['Bad weather destroys part of the crop used as an input.', 'S-'], ['Wages paid to the workers who make the good rise.', 'S-'], ['A new per-unit tax is placed on producers.', 'S-']
  ];
  var EFFECT = { 'D+': 'Price rises and quantity rises.', 'D-': 'Price falls and quantity falls.', 'S+': 'Price falls and quantity rises.', 'S-': 'Price rises and quantity falls.' };
  var WHY = { 'D+': 'That would need demand to increase (shift right).', 'D-': 'That would need demand to decrease (shift left).', 'S+': 'That would need supply to increase (shift right).', 'S-': 'That would need supply to decrease (shift left).' };
  A.defGen('1B', 'shift', 'Effect of a market change on equilibrium price and quantity', function (rng) {
    var e = rng.pick(EV), good = rng.pick(GOODS), key = e[1];
    var wrong = Object.keys(EFFECT).filter(function (k) { return k !== key; }).map(function (k) { return [EFFECT[k], WHY[k]]; });
    var curve = key[0] === 'D' ? 'demand' : 'supply', dir = key[1] === '+' ? 'increases (shifts right)' : 'decreases (shifts left)';
    return A.mc({ rng: rng, topic: '1B', skill: 'shift', stem: 'In the market for ' + good + ': ' + e[0] + ' What happens to the equilibrium price and quantity?', correct: EFFECT[key], wrong: wrong,
      rule: 'Decide which curve moves and which way, then read the new intersection. Demand shifts move P and Q the same way; supply shifts move them in opposite directions.',
      work: 'This changes ' + curve + ': ' + curve + ' ' + dir + '. ' + EFFECT[key], diff: 2, check: function () { return EFFECT[key]; } });
  });

  /* ---------- 2A cost table ---------- */
  function costs(rng) {
    var FC = rng.step(50, 200, 10), x = rng.step(20, 40, 2), mcs = [x, x - 6, x - 8, x - 4, x + 6], TC = [FC];
    mcs.forEach(function (m, i) { TC.push(TC[i] + m); });
    return { FC: FC, mcs: mcs, TC: TC, table: { head: ['Output (units)', 'Total cost'], rows: TC.map(function (t, q) { return [String(q), $(t)]; }) } };
  }
  A.defGen('2A', 'mc', 'Marginal cost from a total cost table', function (rng) {
    var c = costs(rng), k = rng.int(2, 5), mc = c.TC[k] - c.TC[k - 1];
    return A.mc({ rng: rng, topic: '2A', skill: 'mc', stem: 'A firm’s total cost at each output level is shown. What is the marginal cost of producing unit ' + k + '?', table: c.table, correct: mc,
      wrong: [[c.TC[k], 'That is total cost, not the extra cost of one more unit.'], [A.round2(c.TC[k] / k), 'That is average total cost.'], [c.TC[k] - c.FC, 'That is variable cost.'], [A.round2((c.TC[k] - c.FC) / k), 'That is average variable cost.']],
      rule: 'Marginal cost = the change in total cost from producing one more unit.', work: 'MC of unit ' + k + ' = TC(' + k + ') − TC(' + (k - 1) + ') = ' + $(c.TC[k]) + ' − ' + $(c.TC[k - 1]) + ' = ' + $(mc) + '.',
      calc: true, diff: 1, check: function () { return c.TC[k] - c.TC[k - 1]; } });
  });
  A.defGen('2A', 'atc', 'Average total cost from a total cost table', function (rng) {
    var c = costs(rng), k = rng.int(2, 5), atc = A.round2(c.TC[k] / k);
    return A.mc({ rng: rng, topic: '2A', skill: 'atc', stem: 'A firm’s total cost at each output level is shown. What is the average total cost when the firm produces ' + k + ' units?', table: c.table, correct: atc,
      wrong: [[A.round2((c.TC[k] - c.FC) / k), 'That is average variable cost; it leaves out fixed cost.'], [c.TC[k] - c.TC[k - 1], 'That is marginal cost.'], [A.round2(c.FC / k), 'That is average fixed cost.'], [c.TC[k], 'That is total cost; divide by output.']],
      rule: 'Average total cost = total cost ÷ output. Fixed cost is the total cost at zero output.', work: 'ATC = ' + $(c.TC[k]) + ' ÷ ' + k + ' = ' + $(atc) + '.',
      calc: true, diff: 2, check: function () { return A.round2(c.TC[k] / k); } });
  });
  A.defGen('2A', 'fc', 'Fixed and variable cost from a total cost table', function (rng) {
    var c = costs(rng), k = rng.int(2, 5), vc = c.TC[k] - c.FC;
    return A.mc({ rng: rng, topic: '2A', skill: 'fc', stem: 'A firm’s total cost at each output level is shown. What is the firm’s variable cost at ' + k + ' units?', table: c.table, correct: vc,
      wrong: [[c.FC, 'That is fixed cost: the total cost at zero output.'], [c.TC[k], 'That is total cost; subtract fixed cost.'], [c.TC[k] - c.TC[k - 1], 'That is marginal cost.'], [A.round2(vc / k), 'That is average variable cost; the question asks for the total.'], [c.TC[k - 1] - c.FC, 'That is variable cost at one fewer unit.']],
      rule: 'Fixed cost = total cost at zero output. Variable cost = total cost − fixed cost.', work: 'FC = TC(0) = ' + $(c.FC) + '. VC = ' + $(c.TC[k]) + ' − ' + $(c.FC) + ' = ' + $(vc) + '.',
      calc: true, diff: 1, check: function () { return c.TC[k] - c.TC[0]; } });
  });
})();
