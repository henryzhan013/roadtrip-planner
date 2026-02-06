function PlaceCard(props){
    const cardStyle = {
        border: "1px solid white",
        borderRadius: "8px",
        padding: "16px",
        margin: "10px 0",
        backgroundColor: "#333"
    }
    return (
        <div style={cardStyle}>
            <h3> {props.name}</h3>
            <p>{props.score} </p>
        </div>
    )
}

export default PlaceCard