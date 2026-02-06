function PlaceCard(props) {
  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    margin: "10px 0",
    backgroundColor: "white",
    cursor: "pointer",
    color: "#333",
    display: "flex",
    alignItems: "center",
    gap: "15px"
  }

  const rankStyle = {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#4CAF50",
    minWidth: "30px"
  }

  return (
    <div style={cardStyle} onClick={props.onClick}>
      <span style={rankStyle}>{props.rank}</span>
      <div>
        <h3 style={{ margin: "0 0 5px 0" }}>{props.name}</h3>
        <p style={{ margin: 0, color: "#666" }}>Match: {props.score}</p>
      </div>
    </div>
  )
}

export default PlaceCard