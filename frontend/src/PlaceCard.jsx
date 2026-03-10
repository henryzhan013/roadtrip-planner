function PlaceCard(props) {
  return (
    <div className="card card-elevated" style={{
      padding: "16px",
      margin: "12px 0",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "16px"
    }} onClick={props.onClick}>
      <span style={{
        fontSize: "24px",
        fontWeight: "700",
        color: "var(--primary)",
        minWidth: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--primary-bg)",
        borderRadius: "var(--radius)"
      }}>
        {props.rank}
      </span>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "var(--gray-800)" }}>{props.name}</h3>
        {props.rating && (
          <p style={{ margin: 0, color: "var(--gray-500)", fontSize: "14px" }}>⭐ {props.rating}</p>
        )}
        {props.why && (
          <p style={{ margin: "6px 0 0 0", color: "var(--gray-400)", fontSize: "13px" }}>💡 {props.why}</p>
        )}
      </div>
      <button
        className={`favorite-btn ${props.isFavorite ? 'favorited' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          props.onToggleFavorite()
        }}
      >
        {props.isFavorite ? "❤️" : "🤍"}
      </button>
    </div>
  )
}

export default PlaceCard
