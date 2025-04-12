const Rent = require('../models/Rent');
const Car = require('../models/Car');
const car_provider = require('../models/Car_Provider');
const { generateFileHash } = require('../utility/generateHash');
const { BUCKET_NAME, r2Client } = require('../config/r2');
const logs = require('../utility/logs');

//re push
exports.getCars = async (req, res, next) => {
    try {
        let query;
        const reqQuery = { ...req.query };
        const removeFields = ['select', 'sort', 'page', 'limit', 'providerId'];
        
        removeFields.forEach(param => delete reqQuery[param]);
        
        let queryStr = JSON.stringify(reqQuery);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `${match}`);
        
        // Use populate with strict option set to false
        query = Car.find(JSON.parse(queryStr)).populate({
            path: 'rents',
            strictPopulate: false
        });
        
        // Filter by provider ID if specified
        if (req.query.providerId) {
            query = query.where({ provider_id : req.query.providerId });
        }
        
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
        const car = await Car.findById(req.params.id)
            .populate({
                path: 'provider_id',
                select: 'name address telephone_number'
            })
            .populate({
                path: 'rents',
                strictPopulate: false
            });

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
    try {
        // Determine the provider ID based on who's making the request
        let providerId;
        
        if (req.provider) {
            // If it's a provider making the request, use their ID
            providerId = req.provider.id;
        } else if (req.user && req.user.role === 'admin' && req.body.provider_id) {
            // If it's an admin, they can specify the provider_id
            providerId = req.body.provider_id;
        } else {
            // If no valid provider ID can be determined
            return res.status(400).json({
                success: false,
                error: 'Valid provider_id is required'
            });
        }

        // Verify the provider exists
        const provider = await car_provider.findById(providerId);
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                error: `Car provider not found`
            });
        }

        let uploadList;
        let uploadedFiles;
        // Handle image upload
        try {
            if (req.files) {
                uploadList = req.files.map((file) => {
                    const uploadFileName = generateFileHash(file);
                    const params = {
                        Bucket: BUCKET_NAME,
                        Key: `images/${uploadFileName}`,
                        Body: file.buffer,
                        ContentType: file.mimetype,
                    }

                    return r2Client.putObject(params).promise()
                    .then(() => {
                        logs.info(`File uploaded successfully: ${uploadFileName}`);
                        return uploadFileName;
                    })
                })

                uploadedFiles = await Promise.all(uploadList);
            }
        } catch (err) {
            return res.status(500).json({
                success: false,
                error: 'Error uploading images'
            });
        }

        // Create a new car object with the verified provider_id
        const carData = {
            ...req.body,
            provider_id: providerId,
            images: uploadedFiles || [],
            imageOrder: uploadedFiles || [] // Initialize imageOrder with uploaded files
        };
        
        const car = await Car.create(carData);
        
        res.status(201).json({ 
            success: true, 
            data: car
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ 
            success: false,
            message: err.message 
        });
    }
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

    // Check if new provider exists
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
        const carInfo = await Car.findById(req.params.id);
        let keepImage = carInfo.images;
        let keepImageOrder = carInfo.imageOrder || [];

        // User want to change image?
        if (req.body.removeImage) {
            const removeImage = JSON.parse(req.body.removeImage);
            
            // Remove from images
            keepImage = keepImage.filter((image) => !removeImage.includes(image));
            
            // Remove from imageOrder
            keepImageOrder = keepImageOrder.filter((image) => !removeImage.includes(image));
        }

        // New image uploads
        if (req.files && req.files.length > 0) {
            // Upload new images
            const uploadList = req.files.map((file) => {
                const uploadFileName = generateFileHash(file);
                const params = {
                    Bucket: BUCKET_NAME,
                    Key: `images/${uploadFileName}`,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                }
                return r2Client.putObject(params).promise()
                .then(() => {
                    logs.info(`File uploaded successfully: ${uploadFileName}`);
                    return uploadFileName;
                })
            });

            const uploadedFiles = await Promise.all(uploadList);

            // Combine old images with new images
            keepImage = [...keepImage, ...uploadedFiles];
            
            // Combine old imageOrder with new images at the end
            keepImageOrder = [...keepImageOrder, ...uploadedFiles];
        }

        const updateData = {
            ...req.body,
            images: keepImage,
            imageOrder: keepImageOrder
        };

        const car = await Car.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });

        if (!car) {
            return res.status(400).json({ success: false });
        }

        res.status(200).json({ success: true, data: car });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
        logs.error(err);
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

exports.updateCarImageOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { imageOrder } = req.body;

        // Validate input
        if (!Array.isArray(imageOrder)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image order format'
            });
        }

        const car = await Car.findById(id);

        if (!car) {
            return res.status(404).json({
                success: false,
                error: 'Car not found'
            });
        }

        // Validate that all images in order exist in the car's images
        const invalidImages = imageOrder.filter(
            img => !car.images.includes(img)
        );

        if (invalidImages.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Some images in the order do not exist in the car\'s images',
                invalidImages
            });
        }

        // Update the image order
        car.imageOrder = imageOrder;
        await car.save();

        res.status(200).json({
            success: true,
            data: car
        });
    } catch (err) {
        console.error('Error updating image order:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to update image order'
        });
    }
};