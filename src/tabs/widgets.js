import _ from "lodash";
import React from "react";

export function NodeSecs(props) {
  if(_.isNil(props.value)) return "N/A";
  return (props.value/3600).toFixed(2);
}

export function Percent(props) {
  if(_.isNil(props.value)) return "N/A";
  return props.value.toFixed(2);
}

export function ChargeFactor(props) {
  if(_.isNil(props.value)) return "N/A";
  return props.value.toFixed(2);
}

// props 1) alloptions Array of strings with all possible choices. 2) selected - those that are currently selected. 3) onSelDesel - function to process selection/deselection.
export class SearchAndAdd extends React.Component {
  constructor(props) {
    super(props);
    this.state = { selected: this.props.selected, matches: [  ] }

    this.handleTyping = (event) => {
      let srchtxt = event.target.value;
      let matches = _.filter(this.props.alloptions, (x) => { return x.includes(srchtxt) } );
      this.setState({ matches: _.map(matches, (x) => { return {"label": x, "selected": _.includes(this.state.selected, x)}  }) });
    }

    this.checkUncheck = (event) => {
      let selkey = event.target.dataset.selkey;
      console.log(selkey + " has value " + event.target.checked);
      this.props.onSelDesel(selkey, event.target.checked);
      let newselected = event.target.checked ? _.union(this.state.selected, [selkey]) : _.without(this.state.selected, selkey);
      let newmatches = _.map(this.state.matches, (x) => { return {"label": x["label"], "selected": _.includes(newselected, x["label"])}  });
      this.setState({ selected: newselected, matches: newmatches});
    }
  }

  render() {
    return(
      <div className="table-responsive">
        <input onChange={this.handleTyping}/>
        <table className="table table-condensed table-striped table-bordered">
          <thead><tr><th>{this.props.label}</th><th></th></tr></thead>
          <tbody>{ _.map(this.state.matches, (u) => { return (<tr key={u.label}><td>{u.label}</td><td><input type="checkbox" data-selkey={u.label} checked={!!u.selected} onChange={this.checkUncheck}/></td></tr>) }) }</tbody>
        </table>
      </div>
    );
  }
}
