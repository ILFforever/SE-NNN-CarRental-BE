const Rent = require('../models/Rent');
const Car = require('../models/Car');
const car_provider = require('../models/Car_Provider');

exports.getCars = async (req, res, next) => {
    try {
        let query;
        const reqQuery = { ...req.query };
        const removeFields = ['select', 'sort', 'page', 'limit', 'providerId'];
        
        removeFields.forEach(param => delete reqQuery[param]);
        
        let queryStr = JSON.stringify(reqQuery);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `${match}`);
        
        query = Car.find(JSON.parse(queryStr));
        
        // Filter by provider ID if specified
        if (req.query.providerId) {
            query = query.where({ provider_id : req.query.providerId });
        }
        
        query = query.populate('rents');
        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
        }
        
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-manufactureDate');
        }
        
        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Car.countDocuments(query.getQuery());
        const totalCount = await Car.countDocuments(query.getQuery());
        const totalMatchingCount = await Car.countDocuments(query.getQuery());
        query = query.skip(startIndex).limit(limit);
        
        // Execute the query
        const cars = await query;
        
        // Prepare pagination info
        const pagination = {};
        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }
        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }
        
        res.status(200).json({ 
            success: true, 
            count: cars.length,  // Items in current page
            totalCount: totalCount,  // Total matching items across all pages
            totalMatchingCount: totalMatchingCount,
            pagination,
            data: cars 
          });
    } catch (err) {
        console.error(err);
        res.status(400).json({ 
            success: false, 
            message: err.message 
        });
    }
};

//@desc    Get single car
//@route   GET /api/v1/cars/:id
//@access  Public
exports.getCar = async (req, res, next) => {
    try {
        const car = await Car.findById(req.params.id).populate({
            path: 'provider_id',
            select: 'name address telephone_number'
        })
        .populate('rents');

        if (!car) {
            return res.status(400).json({ success: false });
        }

        res.status(200).json({ success: true, data: car });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//@desc    Create new car
//@route   POST /api/v1/cars
//@access  Private
exports.createCar = async(req, res, next) => {

    const provider = await car_provider.findById(req.body.provider_id);
    
    if (!provider) {
        return res.status(404).json({
            success: false,
            error: `Car provider not found`
        });
    }
    //console.log(req.body);
    const car = await Car.create(req.body);
    res.status(201).json({ success: true, data:car});
};

//@desc    Update car
//@route   PUT /api/v1/cars/:id
//@access  Private
exports.updateCar = async (req, res, next) => {
    let car = await Car.findById(req.params.id);
    
    if (!car) {
        return res.status(404).json({
            success: false,
            error: `Car not found`
        });
    }

    //  check if new provider exists
    if (req.body.provider_id) {
        const provider = await car_provider.findById(req.body.provider_id);
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                error: `Car provider not found`
            });
        }
    }

    try {
        const car = await Car.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!car) {
            return res.status(400).json({ success: false });
        }
        res.status(200).json({ success: true, data: car });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};


//@desc    Delete car
//@route   DELETE /api/v1/cars/:id
//@access  Private
exports.deleteCar = async (req, res, next) => {
    try {
        const car = await Car.findById(req.params.id);

        if (!car) {
            return res.status(400).json({ success: false });
        }
        await Rent.deleteMany({car:req.params.id});
        await Car.deleteOne({_id:req.params.id});

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

