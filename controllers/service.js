const mongoose = require('mongoose');
const Service = require('../models/Service');
const Car = require('../models/Car');

//@desc    Get all services
//@route   GET /api/v1/services
//@access  Public
exports.getServices = async (req, res, next) => {
    try {
        const services = await Service.find();
        res.status(200).json({ success: true, data: services });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error" });
    }
};

//@desc    Get services by car ID
//@route   GET /api/v1/services/:carId
//@access  Public
exports.getServicesByCarId = async (req, res, next) => {
    try {
        const car = await Car.findById(req.params.carId);

        if (!car) {
            return res.status(404).json({ success: false, error: 'Car not found' });
        }

        // แปลง string id เป็น ObjectId ก่อน query
        const serviceObjectIds = car.service.map(id => new mongoose.Types.ObjectId(id));

        const services = await Service.find({ _id: { $in: serviceObjectIds } });

        res.status(200).json({
            success: true,
            count: services.length,
            data: services
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
//@desc    Create a new service
//@route   POST /api/v1/services
//@access  Private
exports.createService = async (req, res, next) => {
    try {
        const service = await Service.create(req.body);
        res.status(201).json({ success: true, data: service });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

//@desc    Update an existing service
//@route   PUT /api/v1/services/:id
//@access  Private
exports.updateService = async (req, res, next) => {
    try {
        let service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                error: `Service not found`
            });
        }

        service = await Service.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: service });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
