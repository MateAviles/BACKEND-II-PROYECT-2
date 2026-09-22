

export const getEvents = async(req, res) => {
    try{
        res.status(200).json({status: "success", payload: []});
    }catch(error){
        res.status(500).json({
            error: 'error al entregar listado de eventos'
        });
    }
}