const Rent = require('../models/Rent');
const Car = require('../models/Car');
const car_provider = require('../models/Car_Provider');
const { generateFileHash } = require('../utility/generateHash');
const { BUCKET_NAME, r2Client } = require('../config/r2');
const logs = require('../utility/logs');

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
            images: uploadedFiles
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
  
      // User wants to change image?
      if (req.body.removeImage) {
        const removeImage = JSON.parse(req.body.removeImage);
        keepImage = keepImage.filter((image) => !removeImage.includes(image));
      }
  
      if (req.files) {
        // Handle image upload
        const uploadList = req.files.map((file) => {
          const uploadFileName = generateFileHash(file);
          const params = {
            Bucket: BUCKET_NAME,
            Key: `images/${uploadFileName}`,
            Body: file.buffer,
            ContentType: file.mimetype,
          };
          return r2Client.putObject(params).promise()
            .then(() => {
              logs.info(`File uploaded successfully: ${uploadFileName}`);
              return uploadFileName;
            });
        });
  
        const uploadedFiles = await Promise.all(uploadList);
  
        // Combine old images with new images
        keepImage = [...keepImage, ...uploadedFiles];
      }
  
      // Reorder images based on the provided order
      if (req.body.imageOrder) {
        const imageOrder = JSON.parse(req.body.imageOrder);
        keepImage = imageOrder.map((fileName) => {
          if (keepImage.includes(fileName)) {
            return fileName;
          }
        }).filter(Boolean);
      }
  
      const car = await Car.findByIdAndUpdate(req.params.id, { ...req.body, images: keepImage }, {
        new: true,
        runValidators: true
      });
  
      if (!car) {
        return res.status(400).json({ success: false });
      }
  
      res.status(200).json({ success: true, data: car });
    } catch (err) {
      res.status(400).json({ success: false });
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

