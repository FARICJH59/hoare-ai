from setuptools import setup, find_packages

setup(
    name="hoare-ai",
    version="1.0.0",
    description="Official Python SDK for the hoare-ai agent runtime API.",
    long_description=open("../../README.md").read(),
    long_description_content_type="text/markdown",
    author="HOARE AI",
    license="MIT",
    python_requires=">=3.8",
    py_modules=["client"],
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    project_urls={
        "Documentation": "https://github.com/FARICJH59/hoare-ai",
        "Source": "https://github.com/FARICJH59/hoare-ai",
    },
)
