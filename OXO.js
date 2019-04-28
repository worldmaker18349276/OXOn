
const check_list = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
class OXO {
  constructor(n) {
    this.dim = n;
    function ndarray(n) {
      if ( n == 1 )
        return Array(9).fill(0);
      else
        return Array.from({length:9}, ()=>ndarray(n-1));
    }
    this.states = ndarray(this.dim);
    this.history = [];

    this.preindex = undefined;
    this.scores = {[1]:0, [-1]:0};
  }
  reset() {
    for ( let [index] of this.entries() )
      this.set(index, 0);
    this.history = [];
    this.preindex = undefined;
    this.scores[1] = 0;
    this.scores[-1] = 0;
  }
  get(index) {
    index = index.slice();
    var res = this.states;
    while ( index.length )
      res = res[index.shift()];
    return res;
  }
  set(index, val) {
    index = index.slice();
    var arr = this.states;
    while ( index.length > 1 )
      arr = arr[index.shift()];
    arr[index[0]] = val;
  }
  entries() {
    function *entries(arr, n) {
      if ( n == 1 ) {
        for ( let [i, elem] of arr.entries() )
        yield [[i], elem];
      } else {
        for ( let [i, sub] of arr.entries() )
          for ( let [js, elem] of entries(sub, n-1) )
            yield [[i, ...js], elem];
      }
    }
    return entries(this.states, this.dim);
  }

  get who() {
    return this.history.length%2==0 ? 1 : -1;
  }
  *possible_moves() {
    if ( this.preindex ) {
      for ( let i=0; i<9; i++ )
        if ( this.get([...this.preindex, i]) == 0 )
          yield [...this.preindex, i];

    } else {
      for ( let [ind, elem] of this.entries() )
        if ( elem == 0 )
          yield ind;
    }
  }
  move(index) {
    if ( index.length != this.dim || this.get(index) != 0 )
      return;
    if ( this.preindex ) {
      if ( !this.preindex.every((i, n) => i == index[n]) )
        return;
    }

    this.set(index, this.who);
    this.history.push(index);

    var res = this.updateScore(index);

    this.preindex = index.slice(1);
    if ( Array.from(this.possible_moves()).length == 0 )
      this.preindex = undefined;

    return res;
  }

  updateScore(index) {
    const who = this.get(index);

    var res = [];
    var pre = index.slice(0,-1);
    for ( let line of check_list )
      if ( line.includes(index[index.length-1]) )
        if ( line.every(i => this.get([...pre,i])==who) ) {
          this.scores[who]++;
          res.push([pre, line.join("")]);
        }
    return res;
  }
  computeScores(who) {
    var res = [];
    for ( let [index] of this.entries() ) if ( index[index.length-1] == 0 ) {
      let pre = index.slice(0,-1);
      for ( let line of check_list )
        if ( line.every(i => this.get([...pre,i])==who) )
          res.push([pre, line.join("")]);
    }
    return res;
  }

  serialize() {
    return this.history.map(index => index.join(",")).join("-");
  }
  load(records, check=true) {
    this.reset();
    var history = records.split("-").map(ind => ind.split(",").map(i => parseInt(i)));

    if ( check ) {
      for ( let index of history )
        if ( !this.move(index) )
          return false;

    } else {
      for ( let [n, index] of history.entries() )
        this.set(index, n%2==0?1:-1);
      this.history = history;

      this.scores[ 1] = this.computeScores( 1).length;
      this.scores[-1] = this.computeScores(-1).length;

      this.preindex = history[history.length-1].slice(1);
      if ( Array.from(this.possible_moves()).length == 0 )
        this.preindex = undefined;
    }

    return true;
  }
}

class AIdiot {
  constructor(n, level=0) {
    this.level = level;
    this.sandbox = new OXO(n);
  }

  gain(game, index, level=this.level) {
    if ( level == 0 )
      return 0;

    const who = game.who;
    var res = 0;
    var pre = index.slice(0,-1);
    for ( let line of check_list )
      if ( line.includes(index[index.length-1]) )
        res += line.map(i => game.get([...pre,i])*who+1).reduce((a,b)=>a+b);

    if ( level > 1 ) {
      var records = game.serialize();
      game.move(index);
      var moves = Array.from(game.possible_moves())
                       .map(index_ => this.gain(game, index_, level-1));
      var loss = moves.length==0 ? 0 : moves.reduce((a,b) => a<b?b:a);
      game.load(records, false);
      res = res - loss;
    }

    return res;
  }
  predict(game, level=this.level) {
    this.sandbox.load(game.serialize(), false);
    var res = Array.from(this.sandbox.possible_moves())
                   .map(index => [index, this.gain(this.sandbox, index, level)]);
    if ( res.length == 0 )
      return;
    var max_gain = res.map(e => e[1]).reduce((a,b) => a<b?b:a);
    var indices = res.filter(e => e[1]==max_gain).map(e => e[0]);
    var n = Math.floor(Math.random() * indices.length);
    return indices[n];
  }
}
