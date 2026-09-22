

export const register = async(req, res) => {
    try{
        res.status(200).json({
            status: "success" ,
            payload: "sessions funciona correctamente"
        });
    }catch(error){
        res.status(500).json({
            error: "error en el modulo de sessions"
        });
    }
}